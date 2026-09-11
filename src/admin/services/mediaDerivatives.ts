import {
  formatSizeBytes,
  formatTimestamp,
} from "@/admin/lib/mediaAdapter";
import {
  getSessionObjectUrl,
  loadMediaBlob,
  restoreObjectUrl,
  saveMediaBlob,
  setSessionObjectUrl,
} from "@/admin/services/mediaBlobStore";
import { captureVideoFrame } from "@/admin/services/frameCapture";
import {
  encodeCustomerPreview,
  encodeCustomerPreviewImage,
} from "@/admin/services/previewEncoder";
import { isSeedPlaceholderVideo } from "@/admin/lib/mediaPreview";
import type {
  MediaAsset,
  PreviewQuality,
  WatermarkConfig,
} from "@/admin/types";

export type MaterializeOptions = {
  quality?: PreviewQuality;
  watermark?: WatermarkConfig;
  /** Skip thumbnail extraction (e.g. regenerate preview only) */
  skipThumbnail?: boolean;
  onProgress?: (pct: number) => void;
};

/** True when this asset should use the still-image preview pipeline. */
export function isMasterImageAsset(asset: MediaAsset): boolean {
  if (asset.type === "image") return true;
  if (asset.type === "video") return false;
  const name = asset.originalFileName || asset.master.fileName || "";
  return /\.(png|jpe?g|webp|gif|avif|bmp|svg)$/i.test(name);
}

/**
 * Generate a real customer preview derivative from the master blob:
 * downscale + bitrate limit + baked watermark, then persist to IndexedDB.
 * Also auto-generates a clean thumbnail frame from the master (no watermark)
 * unless skipThumbnail is set (custom image thumbnails).
 *
 * Always ends in READY or FAILED — never leaves PROCESSING indefinitely.
 */
export async function materializePreviewAndThumbnail(
  asset: MediaAsset,
  onUpdate: (partial: Partial<MediaAsset>) => void,
  options?: MaterializeOptions,
): Promise<void> {
  const quality = options?.quality ?? asset.previewQuality ?? "optimized";
  const watermark: WatermarkConfig = options?.watermark ?? {
    enabled: true,
    style: "diagonal",
    opacity: 45,
    size: "large",
    movement: "subtle",
  };
  const isImage = isMasterImageAsset(asset);
  // Images never use video frame capture — public thumb = watermarked preview.
  const skipThumbnail = isImage || Boolean(options?.skipThumbnail);

  onUpdate({
    processingStatus: "processing",
    processingError: undefined,
    processingSteps: {
      ...asset.processingSteps,
      uploadComplete: true,
      previewGenerating: true,
      previewReady: false,
      watermarkApplying: watermark.enabled,
      watermarkReady: false,
      thumbnailExtracting: !skipThumbnail,
      thumbnailReady: skipThumbnail
        ? isImage
          ? false
          : asset.processingSteps.thumbnailReady
        : false,
    },
  });

  let masterUrl =
    getSessionObjectUrl(asset.id, "original") ||
    (await restoreObjectUrl(asset.id, "original")) ||
    "";

  if (!masterUrl) {
    const original = await loadMediaBlob(asset.id, "original");
    if (original?.blob) {
      masterUrl = URL.createObjectURL(original.blob);
      setSessionObjectUrl(asset.id, masterUrl, "original");
    }
  }

  if (
    !masterUrl &&
    asset.master.url &&
    !asset.master.url.startsWith("blob:") &&
    !isSeedPlaceholderVideo(asset.master.url)
  ) {
    // Same-origin static master only — never seed placeholder paths
    masterUrl = asset.master.url;
  }

  // Last resort: in-session master.url blob (upload path stores this on the asset)
  if (!masterUrl && asset.master.url?.startsWith("blob:")) {
    masterUrl = asset.master.url;
  }

  // Persist durable/static masters into IDB so rehydrate never loses master.url
  // when only a generated preview blob was previously stored.
  if (
    masterUrl &&
    !masterUrl.startsWith("blob:") &&
    !(await loadMediaBlob(asset.id, "original"))
  ) {
    try {
      const res = await fetch(masterUrl);
      if (res.ok) {
        const blob = await res.blob();
        const fileName =
          asset.master.fileName ||
          asset.originalFileName ||
          "master-original";
        await saveMediaBlob(asset.id, blob, fileName, "original");
        const objectUrl = URL.createObjectURL(blob);
        setSessionObjectUrl(asset.id, objectUrl, "original");
        masterUrl = objectUrl;
      }
    } catch {
      /* keep using the durable URL */
    }
  }

  if (!masterUrl) {
    onUpdate({
      processingStatus: "failed",
      processingError:
        "Master file is missing from local storage. Re-upload the master to generate a customer preview.",
      processingSteps: {
        ...asset.processingSteps,
        uploadComplete: true,
        previewGenerating: false,
        previewReady: false,
        watermarkApplying: false,
        watermarkReady: false,
        thumbnailExtracting: false,
      },
      previewPlayback: "none",
      preview: {
        ...asset.preview,
        status: "failed",
        url: "",
        watermarkApplied: false,
      },
    });
    return;
  }

  try {
    const encoded = isImage
      ? await encodeCustomerPreviewImage({
          masterUrl,
          quality,
          watermark,
        })
      : await encodeCustomerPreview({
          masterUrl,
          quality,
          watermark,
          onProgress: options?.onProgress,
        });

    const ext = isImage ? "jpg" : "webm";
    const previewName = `preview-${quality}-${asset.originalFileName.replace(/\.[^.]+$/, "")}.${ext}`;
    // CRITICAL: write only to IndexedDB kind "preview" — never overwrite "original"/master
    await saveMediaBlob(asset.id, encoded.blob, previewName, "preview");

    const prevPreview = getSessionObjectUrl(asset.id, "preview");
    if (prevPreview) {
      try {
        URL.revokeObjectURL(prevPreview);
      } catch {
        /* ignore */
      }
    }
    const previewUrl = URL.createObjectURL(encoded.blob);
    setSessionObjectUrl(asset.id, previewUrl, "preview");

    if (isImage) {
      onUpdate({
        // Do NOT touch `master` — original upload stays intact / unwatermarked
        preview: {
          url: previewUrl,
          status: "ready",
          resolution: encoded.resolution,
          quality,
          watermarkApplied: encoded.watermarkApplied,
          access: "public",
          sizeBytes: encoded.sizeBytes,
          sizeLabel: formatSizeBytes(encoded.sizeBytes),
        },
        previewQuality: quality,
        previewPlayback: "generated",
        previewStale: false,
        // Keep thumbnail clean (master) — never point it at the watermarked preview.
        // Storefront reads preview.url for public/customer display.
        thumbnail: {
          url: asset.master.url || asset.thumbnail.url || "",
          source: "custom" as const,
          timestamp: 0,
          timestampLabel: "00:00.0",
        },
        processingSteps: {
          uploadComplete: true,
          previewGenerating: false,
          previewReady: true,
          watermarkApplying: false,
          watermarkReady: encoded.watermarkApplied || !watermark.enabled,
          thumbnailExtracting: false,
          thumbnailReady: true,
        },
        processingStatus: "ready",
        processingError: undefined,
        hasLocalBlob: true,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    onUpdate({
      // Do NOT touch `master` — original upload stays intact
      preview: {
        url: previewUrl,
        status: "ready",
        resolution: encoded.resolution,
        quality,
        watermarkApplied: encoded.watermarkApplied,
        access: "public",
        sizeBytes: encoded.sizeBytes,
        sizeLabel: formatSizeBytes(encoded.sizeBytes),
      },
      previewQuality: quality,
      previewPlayback: "generated",
      previewStale: false,
      // Mark READY as soon as the preview derivative exists — do not wait on
      // thumbnail frame capture (that can hang and left cards spinning forever).
      processingStatus: "ready",
      processingError: undefined,
      processingSteps: {
        ...asset.processingSteps,
        uploadComplete: true,
        previewGenerating: false,
        previewReady: true,
        watermarkApplying: false,
        watermarkReady: encoded.watermarkApplied || !watermark.enabled,
        thumbnailExtracting: !skipThumbnail,
        thumbnailReady: skipThumbnail
          ? asset.processingSteps.thumbnailReady
          : false,
      },
      hasLocalBlob: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Preview encode failed";
    // Do NOT fall back to exposing master as the public preview URL.
    onUpdate({
      processingStatus: "failed",
      processingError: message,
      previewPlayback: "none",
      preview: {
        ...asset.preview,
        status: "failed",
        url: "",
        watermarkApplied: false,
      },
      processingSteps: {
        ...asset.processingSteps,
        previewGenerating: false,
        previewReady: false,
        watermarkApplying: false,
        watermarkReady: false,
        thumbnailExtracting: false,
      },
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  if (skipThumbnail) {
    onUpdate({
      processingStatus: "ready",
      processingError: undefined,
      processingSteps: {
        uploadComplete: true,
        previewGenerating: false,
        previewReady: true,
        watermarkApplying: false,
        watermarkReady: true,
        thumbnailExtracting: false,
        thumbnailReady: asset.processingSteps.thumbnailReady,
      },
    });
    return;
  }

  const thumbTs = Math.min(
    8.4,
    Math.max(0.5, (asset.master.durationSeconds || 12) * 0.35),
  );

  try {
    const frame = await captureVideoFrame(masterUrl, thumbTs);
    await saveMediaBlob(asset.id, frame.blob, `${asset.id}-thumb.jpg`, "thumb");
    const prevThumb = getSessionObjectUrl(asset.id, "thumb");
    if (prevThumb) {
      try {
        URL.revokeObjectURL(prevThumb);
      } catch {
        /* ignore */
      }
    }
    const thumbUrl = URL.createObjectURL(frame.blob);
    setSessionObjectUrl(asset.id, thumbUrl, "thumb");

    onUpdate({
      thumbnail: {
        url: thumbUrl,
        source: "frame",
        timestamp: thumbTs,
        timestampLabel: formatTimestamp(thumbTs),
      },
      processingSteps: {
        uploadComplete: true,
        previewGenerating: false,
        previewReady: true,
        watermarkApplying: false,
        watermarkReady: true,
        thumbnailExtracting: false,
        thumbnailReady: true,
      },
      processingStatus: "ready",
      processingError: undefined,
      hasLocalBlob: true,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    onUpdate({
      processingSteps: {
        uploadComplete: true,
        previewGenerating: false,
        previewReady: true,
        watermarkApplying: false,
        watermarkReady: true,
        thumbnailExtracting: false,
        thumbnailReady: false,
      },
      processingStatus: "ready",
      processingError:
        "Thumbnail frame extraction failed — pick a frame manually",
      updatedAt: new Date().toISOString(),
    });
  }
}

/** Persist a user-selected frame as the media thumbnail and return its object URL. */
export async function persistFrameThumbnail(
  assetId: string,
  videoSrc: string,
  timeSeconds: number,
): Promise<{ url: string; timestamp: number; timestampLabel: string }> {
  const frame = await captureVideoFrame(videoSrc, timeSeconds);
  await saveMediaBlob(assetId, frame.blob, `${assetId}-thumb.jpg`, "thumb");
  const prev = getSessionObjectUrl(assetId, "thumb");
  if (prev) {
    try {
      URL.revokeObjectURL(prev);
    } catch {
      /* ignore */
    }
  }
  const url = URL.createObjectURL(frame.blob);
  setSessionObjectUrl(assetId, url, "thumb");
  return {
    url,
    timestamp: timeSeconds,
    timestampLabel: formatTimestamp(timeSeconds),
  };
}

export function mergeWatermarkConfig(
  globalWm: WatermarkConfig,
  mode: "global" | "custom",
  override?: Partial<WatermarkConfig>,
): WatermarkConfig {
  if (mode === "custom" && override) {
    return {
      ...globalWm,
      ...override,
      enabled: override.enabled ?? globalWm.enabled,
    };
  }
  return globalWm;
}
