import type { MediaAsset } from "@/admin/types";
import { normalizeMediaAssetType } from "@/admin/types";
import { lookupSeedPublicImageUrl } from "@/admin/data/imageCollectionsSeed";
import {
  restoreObjectUrl,
} from "@/admin/services/mediaBlobStore";

export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:video")) return true;
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
}

export function isImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith("data:image")) return true;
  if (url.startsWith("blob:")) return false;
  return /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url);
}

/** Seed catalog used missing public .mp4 paths — never treat as playable. */
export function isSeedPlaceholderVideo(url: string | undefined | null): boolean {
  if (!url) return false;
  return /\/media\/(videos|protected)\/.+\.mp4$/i.test(url);
}

function stripEphemeralOrPlaceholder(url: string): string {
  if (url.startsWith("blob:")) return "";
  if (isSeedPlaceholderVideo(url)) return "";
  return url;
}

/**
 * MASTER / ORIGINAL only — never the watermarked customer preview.
 * Used by Admin Media Library and thumbnail frame capture.
 */
export function getMasterVideoUrl(asset: MediaAsset): string {
  const url = asset.master.url;
  if (isVideoUrl(url) && !isSeedPlaceholderVideo(url)) return url;
  return "";
}

/**
 * CUSTOMER PREVIEW only — generated derivative (may be watermarked / lower quality).
 * Never falls back to master (storefront must not expose the original).
 * Accepts video and image preview URLs, including session blob: URLs.
 */
export function getCustomerPreviewUrl(asset: MediaAsset): string {
  if (asset.previewPlayback !== "generated" && !asset.preview.watermarkApplied) {
    return "";
  }
  const url = asset.preview.url;
  if (!url || isSeedPlaceholderVideo(url)) return "";
  // Never treat an identical master URL as a "preview" (unwatermarked original).
  if (url === asset.master.url && !asset.preview.watermarkApplied) return "";
  if (
    url.startsWith("blob:") ||
    url.startsWith("data:") ||
    isImageUrl(url) ||
    isVideoUrl(url)
  ) {
    return url;
  }
  return "";
}

/**
 * True when a URL can render as an admin still (blob/data/http(s)/path).
 * Broader than isImageUrl — legacy CMS entries often lack file extensions.
 */
export function isUsableAdminMediaUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:")) return true;
  if (isSeedPlaceholderVideo(url)) return false;
  if (isImageUrl(url) || isVideoUrl(url)) return true;
  // Absolute or root-relative paths / remote URLs without a clear extension
  if (/^(https?:\/\/|\/)/i.test(url)) return true;
  return false;
}

/**
 * ADMIN Media Library / pickers — resolve the clean Master / original.
 *
 * Backward compatible with legacy records where the original may live on
 * `thumbnail.url`, an un-watermarked `preview.url`, or only as a durable
 * path on `master.url` (no IndexedDB "original" blob yet).
 *
 * Never prefers the watermarked customer preview when a clean source exists.
 */
export function resolveAdminMasterDisplayUrl(asset: MediaAsset): string {
  const preview = asset.preview.url;
  const watermarkedPreview =
    Boolean(preview) &&
    (asset.preview.watermarkApplied || asset.previewPlayback === "generated");

  const master = asset.master.url;
  if (isUsableAdminMediaUrl(master) && !(watermarkedPreview && master === preview)) {
    return master;
  }

  const thumb = asset.thumbnail.url;
  if (
    isUsableAdminMediaUrl(thumb) &&
    !(watermarkedPreview && thumb === preview)
  ) {
    return thumb;
  }

  // Legacy: preview held the only file / original-fallback (not watermarked)
  if (
    isUsableAdminMediaUrl(preview) &&
    (!watermarkedPreview || asset.previewPlayback === "original-fallback")
  ) {
    return preview;
  }

  // Last resort: durable master/thumb even if equal to preview (better than blank)
  if (isUsableAdminMediaUrl(master)) return master;
  if (isUsableAdminMediaUrl(thumb)) return thumb;

  // Seed images whose master.url was wiped still keep originalFileName.
  if (asset.type === "image") {
    const fromSeed =
      lookupSeedPublicImageUrl(asset.originalFileName) ||
      lookupSeedPublicImageUrl(asset.master.fileName);
    if (fromSeed) return fromSeed;
  }

  return "";
}

/**
 * Media Library / admin visual URL — clean Master (never watermarked Preview).
 */
export function getLibraryDisplayUrl(asset: MediaAsset): string {
  return resolveAdminMasterDisplayUrl(asset);
}

/**
 * @deprecated Prefer getMasterVideoUrl (detail) or getCustomerPreviewUrl (display).
 */
export function getPlayableVideoUrl(asset: MediaAsset): string {
  return getCustomerPreviewUrl(asset) || getMasterVideoUrl(asset);
}

export function getPosterUrl(asset: MediaAsset): string {
  const thumb = asset.thumbnail.url;
  if (thumb && isImageUrl(thumb)) return thumb;
  return "";
}

export type PreviewUiStatus =
  | "loading"
  | "processing"
  | "ready"
  | "failed"
  | "empty"
  | "restoring";

/** Admin library readiness for Preview display (not master availability). */
export function getPreviewDisplayUiStatus(asset: MediaAsset): PreviewUiStatus {
  if (
    asset.processingStatus === "uploading" ||
    asset.processingStatus === "queued"
  ) {
    return "loading";
  }
  if (asset.processingStatus === "failed") return "failed";
  // Only "processing" while a job is actually running — bare "uploaded"
  // (seed stubs / waiting) must not spin forever as "Generating preview".
  if (
    asset.processingStatus === "processing" ||
    asset.processingSteps.previewGenerating
  ) {
    return "processing";
  }
  if (getCustomerPreviewUrl(asset)) return "ready";
  if (
    asset.previewPlayback === "generated" ||
    asset.preview.watermarkApplied ||
    (asset.hasLocalBlob && asset.processingStatus === "ready")
  ) {
    return "restoring";
  }
  if (getPosterUrl(asset) || isImageUrl(asset.thumbnail.url)) return "ready";
  if (asset.master.url || asset.hasLocalBlob) return "empty";
  return "empty";
}

/** Admin readiness based on master availability (detail / frame capture). */
export function getMasterUiStatus(asset: MediaAsset): PreviewUiStatus {
  if (
    asset.processingStatus === "uploading" ||
    asset.processingStatus === "queued"
  ) {
    return "loading";
  }
  if (getMasterVideoUrl(asset)) return "ready";
  if (asset.hasLocalBlob) return "restoring";
  if (asset.processingStatus === "failed" && !asset.hasLocalBlob) {
    return "failed";
  }
  if (
    asset.processingStatus === "processing" ||
    asset.processingSteps.previewGenerating
  ) {
    return "processing";
  }
  return "empty";
}

/** @deprecated Prefer getPreviewDisplayUiStatus for library cards. */
export function getPreviewUiStatus(asset: MediaAsset): PreviewUiStatus {
  return getPreviewDisplayUiStatus(asset);
}

/**
 * Strip ephemeral blob: URLs and seed placeholder paths before writing to localStorage.
 * IndexedDB is the durable store for File/Blob bytes.
 * Also heals video assets stuck forever in "processing" / "uploaded" with no master.
 */
export function sanitizeMediaAssetsForStorage(
  assets: MediaAsset[],
): MediaAsset[] {
  return assets.map((a) => {
    const type = normalizeMediaAssetType(a.type);
    let masterUrl = stripEphemeralOrPlaceholder(a.master.url);
    const previewUrl = stripEphemeralOrPlaceholder(a.preview.url);
    const thumbUrl = a.thumbnail.url.startsWith("blob:")
      ? ""
      : a.thumbnail.url;
    // Heal empty master from legacy clean sources (do not invent from watermarked preview).
    if (!masterUrl && thumbUrl && thumbUrl !== previewUrl) {
      masterUrl = thumbUrl;
    } else if (
      !masterUrl &&
      previewUrl &&
      !a.preview.watermarkApplied &&
      a.previewPlayback !== "generated"
    ) {
      masterUrl = previewUrl;
    }
    // Evidence-based recovery: seed images wiped master.url but kept originalFileName.
    // Clean originals still live at public seed paths (e.g. /media/characters/nia.jpg).
    if (!masterUrl && type === "image") {
      masterUrl =
        lookupSeedPublicImageUrl(a.originalFileName) ||
        lookupSeedPublicImageUrl(a.master.fileName) ||
        "";
    }
    const healedThumb =
      thumbUrl ||
      (type === "image" && masterUrl && masterUrl !== previewUrl ? masterUrl : "");
    const hadBlob =
      !!a.hasLocalBlob ||
      a.master.url.startsWith("blob:") ||
      a.preview.url.startsWith("blob:") ||
      a.thumbnail.url.startsWith("blob:");

    const realGenerated =
      a.previewPlayback === "generated" ||
      Boolean(a.preview.sizeBytes) ||
      (hadBlob && Boolean(previewUrl));

    let previewPlayback: MediaAsset["previewPlayback"] = "none";
    if (realGenerated && (previewUrl || a.preview.sizeBytes || hadBlob)) {
      if (previewUrl || a.preview.sizeBytes) {
        previewPlayback = "generated";
      } else if (hadBlob) {
        previewPlayback =
          a.previewPlayback === "generated"
            ? "generated"
            : "original-fallback";
      }
    } else if (a.previewPlayback === "original-fallback" && (masterUrl || hadBlob)) {
      previewPlayback = "original-fallback";
    } else if (hadBlob && !previewUrl) {
      previewPlayback = "original-fallback";
    } else {
      previewPlayback = "none";
    }

    let processingStatus = a.processingStatus;
    let processingSteps = { ...a.processingSteps };
    let processingError = a.processingError;

    // Video seed stubs / orphaned jobs: no master bytes → cannot generate preview.
    // Stop infinite "Generating preview…" by clearing stuck processing flags.
    const canEncodeVideo =
      type === "video" && (hadBlob || Boolean(masterUrl));
    if (type === "video" && !canEncodeVideo) {
      const stuckGenerating =
        processingStatus === "processing" ||
        processingStatus === "uploaded" ||
        processingSteps.previewGenerating;
      if (stuckGenerating) {
        processingStatus = thumbUrl ? "ready" : "failed";
        processingSteps = {
          ...processingSteps,
          uploadComplete: Boolean(thumbUrl),
          previewGenerating: false,
          previewReady: false,
          watermarkApplying: false,
          watermarkReady: false,
          thumbnailExtracting: false,
          thumbnailReady: Boolean(thumbUrl),
        };
        processingError = thumbUrl
          ? undefined
          : "No master video on device. Upload a master to generate preview.";
      }
    }

    // Preview already generated but status left on processing (thumbnail hang).
    if (
      type === "video" &&
      previewPlayback === "generated" &&
      (processingStatus === "processing" || processingSteps.previewGenerating)
    ) {
      processingStatus = "ready";
      processingSteps = {
        ...processingSteps,
        previewGenerating: false,
        previewReady: true,
        watermarkApplying: false,
        watermarkReady: true,
        thumbnailExtracting: false,
      };
      processingError = undefined;
    }

    return {
      ...a,
      type,
      master: { ...a.master, url: masterUrl },
      preview: {
        ...a.preview,
        url: previewUrl,
        watermarkApplied:
          previewPlayback === "generated" ? a.preview.watermarkApplied : false,
      },
      thumbnail: {
        ...a.thumbnail,
        url: healedThumb,
      },
      hasLocalBlob: hadBlob,
      previewPlayback,
      processingStatus,
      processingSteps,
      processingError,
    };
  });
}

/** Rebuild usedByProductIds from product.mediaAssetId + AI image media refs. */
export function recomputeMediaUsage(
  assets: MediaAsset[],
  products: {
    id: string;
    mediaAssetId?: string;
    aiImageData?: { images?: Array<{ mediaAssetId?: string }> };
  }[],
): MediaAsset[] {
  const usage = new Map<string, string[]>();
  const add = (assetId: string | undefined, productId: string) => {
    if (!assetId) return;
    const list = usage.get(assetId) ?? [];
    if (!list.includes(productId)) list.push(productId);
    usage.set(assetId, list);
  };
  for (const p of products) {
    add(p.mediaAssetId, p.id);
    for (const img of p.aiImageData?.images ?? []) {
      add(img.mediaAssetId, p.id);
    }
  }
  return assets.map((a) => ({
    ...a,
    usedByProductIds: usage.get(a.id) ?? [],
  }));
}

/**
 * Rebuild session object URLs from IndexedDB onto media asset metadata.
 * Call after loading CMS state from localStorage.
 */
export async function rehydrateMediaObjectUrls(
  assets: MediaAsset[],
): Promise<MediaAsset[]> {
  return Promise.all(
    assets.map(async (asset) => {
      const type = normalizeMediaAssetType(asset.type);
      const thumbFromIdb = await restoreObjectUrl(asset.id, "thumb");
      const durableThumb =
        !asset.thumbnail.url.startsWith("blob:") &&
        isUsableAdminMediaUrl(asset.thumbnail.url)
          ? asset.thumbnail.url
          : "";
      const existingThumb = thumbFromIdb || durableThumb;

      // Always clear seed placeholder paths from hydrated state
      const cleanPreview = isSeedPlaceholderVideo(asset.preview.url)
        ? ""
        : asset.preview.url.startsWith("blob:")
          ? ""
          : asset.preview.url;
      let cleanMaster = isSeedPlaceholderVideo(asset.master.url)
        ? ""
        : asset.master.url.startsWith("blob:")
          ? ""
          : asset.master.url;

      // Heal empty durable master from legacy clean fields before IDB restore.
      if (!cleanMaster && durableThumb && durableThumb !== cleanPreview) {
        cleanMaster = durableThumb;
      } else if (
        !cleanMaster &&
        cleanPreview &&
        !asset.preview.watermarkApplied &&
        asset.previewPlayback !== "generated"
      ) {
        cleanMaster = cleanPreview;
      }

      // Seed-derived images: master.url was wiped from localStorage after preview
      // encode, but originalFileName still points at the public clean original
      // (e.g. nia.jpg → /media/characters/nia.jpg). IndexedDB only has preview.
      if (!cleanMaster && type === "image") {
        cleanMaster =
          lookupSeedPublicImageUrl(asset.originalFileName) ||
          lookupSeedPublicImageUrl(asset.master.fileName) ||
          "";
      }

      // Always try IDB original — hasLocalBlob can be wrong for URL-migrated images
      // that only stored a generated preview blob.
      const masterFromIdb = await restoreObjectUrl(asset.id, "original");
      const previewFromIdb = await restoreObjectUrl(asset.id, "preview");

      const masterUrl = masterFromIdb || cleanMaster || "";
      const previewUrl = previewFromIdb || cleanPreview || "";

      if (!masterUrl && !previewUrl && !existingThumb) {
        return {
          ...asset,
          type,
          master: { ...asset.master, url: "" },
          preview: { ...asset.preview, url: "" },
          thumbnail: { ...asset.thumbnail, url: "" },
          previewPlayback: "none" as const,
          processingError:
            asset.processingError ||
            (asset.hasLocalBlob
              ? "Original file missing from local storage. Re-upload to restore."
              : asset.processingError),
        };
      }

      // Keep master and preview URLs strictly separate — never copy master into preview.url.
      // CRITICAL: do not wipe a durable master path when only the preview blob is in IDB.
      return {
        ...asset,
        type,
        master: {
          ...asset.master,
          url: masterUrl,
        },
        preview: {
          ...asset.preview,
          url: previewUrl,
          status: previewUrl
            ? asset.preview.status === "failed"
              ? "failed"
              : "ready"
            : asset.preview.status,
        },
        thumbnail: {
          ...asset.thumbnail,
          url:
            existingThumb ||
            (type === "image" && masterUrl && masterUrl !== previewUrl
              ? masterUrl
              : "") ||
            durableThumb,
        },
        previewPlayback: previewFromIdb
          ? ("generated" as const)
          : previewUrl &&
              (asset.previewPlayback === "generated" ||
                asset.preview.watermarkApplied)
            ? ("generated" as const)
            : masterUrl
              ? asset.previewPlayback === "generated"
                ? "generated"
                : ("original-fallback" as const)
              : ("none" as const),
        hasLocalBlob:
          Boolean(asset.hasLocalBlob) ||
          Boolean(masterFromIdb) ||
          Boolean(previewFromIdb),
      };
    }),
  );
}
