"use client";

import { MediaLibraryPickerModal } from "@/admin/components/media/MediaLibraryPickerModal";
import { MediaPreviewPlayer } from "@/admin/components/media/MediaPreviewPlayer";
import { ProcessingStepsList } from "@/admin/components/media/ProcessingStepsList";
import { ThumbnailFramePicker } from "@/admin/components/media/ThumbnailFramePicker";
import { UploadMediaModal } from "@/admin/components/media/UploadMediaModal";
import { WatermarkPreview } from "@/admin/components/media/WatermarkPreview";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import {
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { assetToProductMedia, formatTimestamp } from "@/admin/lib/mediaAdapter";
import { resolveMediaThumbnail } from "@/admin/lib/resolveThumbnails";
import { isSeedPlaceholderVideo } from "@/admin/lib/mediaPreview";
import {
  saveMediaBlob,
  setSessionObjectUrl,
  getSessionObjectUrl,
  restoreObjectUrl,
} from "@/admin/services/mediaBlobStore";
import {
  materializePreviewAndThumbnail,
  mergeWatermarkConfig,
  persistFrameThumbnail,
} from "@/admin/services/mediaDerivatives";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  AdminProduct,
  PreviewQuality,
  WatermarkConfig,
  WatermarkMovement,
  WatermarkSize,
  WatermarkStyle,
} from "@/admin/types";
import { Check, Film, Library, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function CustomerPreviewPlayer({
  src,
  poster,
  generating,
}: {
  src: string;
  poster?: string;
  generating?: boolean;
}) {
  if (generating) {
    return (
      <div className="flex aspect-[9/16] w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-xl bg-[var(--admin-surface-2)] text-center text-xs text-[var(--admin-muted)]">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--admin-accent)]" />
        Encoding customer preview…
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex aspect-[9/16] w-full max-w-[200px] flex-col items-center justify-center gap-2 rounded-xl bg-[var(--admin-surface-2)] text-center text-xs text-[var(--admin-muted)]">
        <Film className="h-6 w-6" />
        Preview not ready — regenerate
      </div>
    );
  }

  return (
    <div
      className="relative aspect-[9/16] w-full max-w-[200px] overflow-hidden rounded-xl bg-black shadow-[var(--admin-shadow-sm)]"
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        src={src}
        poster={poster || undefined}
        className="h-full w-full object-cover"
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        draggable={false}
      />
    </div>
  );
}

export function ProductMediaSection({
  draft,
  onChange,
}: {
  draft: AdminProduct;
  onChange: (next: AdminProduct) => void;
}) {
  const {
    mediaAssets,
    mediaSettings,
    updateMediaAsset,
    attachMediaToProduct,
    detachMediaFromProduct,
    pushToast,
  } = useAdmin();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [replaceUploadOpen, setReplaceUploadOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scrub, setScrub] = useState(0);
  const [frameBusy, setFrameBusy] = useState(false);
  const [wmPreviewOpen, setWmPreviewOpen] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [regenProgress, setRegenProgress] = useState<number | null>(null);
  const [masterFrameSrc, setMasterFrameSrc] = useState("");

  const asset = useMemo(
    () => mediaAssets.find((a) => a.id === draft.mediaAssetId),
    [mediaAssets, draft.mediaAssetId],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!asset) {
        setMasterFrameSrc("");
        return;
      }
      const live =
        (asset.master.url &&
        !isSeedPlaceholderVideo(asset.master.url) &&
        asset.master.url.startsWith("blob:")
          ? asset.master.url
          : "") ||
        getSessionObjectUrl(asset.id, "original") ||
        "";
      if (live) {
        setMasterFrameSrc(live);
        return;
      }
      if (asset.hasLocalBlob) {
        const url = await restoreObjectUrl(asset.id, "original");
        if (!cancelled) setMasterFrameSrc(url || "");
        return;
      }
      if (!cancelled) setMasterFrameSrc("");
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  useEffect(() => {
    if (!asset || !draft.mediaAssetId) return;
    const nextMedia = assetToProductMedia(asset);
    if (
      draft.media.thumbnail === nextMedia.thumbnail &&
      draft.media.previewVideo === nextMedia.previewVideo &&
      draft.media.downloadFileName === nextMedia.downloadFileName &&
      draft.media.downloadFileSize === nextMedia.downloadFileSize
    ) {
      return;
    }
    onChange({
      ...draft,
      media: nextMedia,
      duration: asset.master.duration || draft.duration,
      resolution: asset.master.resolution || draft.resolution,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    asset?.id,
    asset?.processingStatus,
    asset?.thumbnail.url,
    asset?.preview.url,
    asset?.master.fileName,
    asset?.master.sizeLabel,
  ]);

  useEffect(() => {
    if (asset?.thumbnail.timestamp != null) {
      setScrub(asset.thumbnail.timestamp);
    }
  }, [asset?.id, asset?.thumbnail.timestamp]);

  const attach = (assetId: string) => {
    const a = mediaAssets.find((x) => x.id === assetId);
    if (draft.id) {
      attachMediaToProduct(draft.id, assetId);
    }
    onChange({
      ...draft,
      mediaAssetId: assetId,
      media: a ? assetToProductMedia(a) : draft.media,
      duration: a?.master.duration ?? draft.duration,
      resolution: a?.master.resolution ?? draft.resolution,
      watermarkMode: a?.watermarkMode ?? "global",
      previewQuality: a?.previewQuality ?? "optimized",
      thumbnailMode: a?.thumbnail.source ?? "frame",
    });
  };

  const detach = () => {
    if (draft.id && draft.mediaAssetId) {
      detachMediaFromProduct(draft.id);
    }
    onChange({
      ...draft,
      mediaAssetId: undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  // Thumbnails must always come from the clean master — never the watermarked preview.
  const videoSrcForFrames = masterFrameSrc;

  const setFrame = async (seconds: number) => {
    if (!asset) return;
    setFrameBusy(true);
    try {
      let src = videoSrcForFrames;
      if (!src && asset.hasLocalBlob) {
        src = (await restoreObjectUrl(asset.id, "original")) || "";
        if (src) setMasterFrameSrc(src);
      }
      if (!src) {
        pushToast(
          "Master video required to capture a clean thumbnail frame",
          "error",
        );
        return;
      }
      const saved = await persistFrameThumbnail(asset.id, src, seconds);
      updateMediaAsset(
        asset.id,
        {
          thumbnail: {
            url: saved.url,
            source: "frame",
            timestamp: saved.timestamp,
            timestampLabel: saved.timestampLabel,
          },
          processingSteps: {
            ...asset.processingSteps,
            thumbnailReady: true,
          },
        },
        "Clean thumbnail frame saved",
      );
      onChange({
        ...draft,
        thumbnailMode: "frame",
        media: { ...draft.media, thumbnail: saved.url },
      });
    } catch {
      pushToast("Could not capture frame from video", "error");
    } finally {
      setFrameBusy(false);
    }
  };

  const autoPick = async () => {
    if (!asset) return;
    const seconds = Math.min(
      asset.master.durationSeconds * 0.35,
      Math.max(0.5, asset.master.durationSeconds - 0.5),
    );
    setScrub(seconds);
    await setFrame(seconds);
  };

  const regeneratePreview = async () => {
    if (!asset) return;
    const hasMaster =
      Boolean(getSessionObjectUrl(asset.id, "original")) ||
      Boolean(asset.hasLocalBlob) ||
      (Boolean(asset.master.url) &&
        asset.master.url.startsWith("blob:"));
    if (!hasMaster) {
      // Try restoring from IndexedDB before giving up
      const restored = await restoreObjectUrl(asset.id, "original");
      if (!restored) {
        pushToast(
          "No master video in storage — re-upload the master to generate a preview",
          "error",
        );
        setReplaceUploadOpen(true);
        return;
      }
    }
    setRegenBusy(true);
    setRegenProgress(0);
    try {
      const wm = mergeWatermarkConfig(
        mediaSettings.watermark,
        draft.watermarkMode ?? asset.watermarkMode ?? "global",
        draft.watermarkOverride ?? asset.watermarkConfig,
      );
      const quality =
        draft.previewQuality ?? asset.previewQuality ?? "optimized";
      await materializePreviewAndThumbnail(
        asset,
        (partial) => {
          updateMediaAsset(asset.id, partial, null);
        },
        {
          quality,
          watermark: wm,
          // Re-capture clean master frames; only skip when admin uploaded a custom image
          skipThumbnail:
            asset.thumbnail.source === "custom" && Boolean(asset.thumbnail.url),
          onProgress: (pct) => setRegenProgress(pct),
        },
      );
      pushToast("Customer preview regenerated (derivative + watermark)");
    } catch {
      pushToast("Preview regeneration failed", "error");
    } finally {
      setRegenBusy(false);
      setRegenProgress(null);
    }
  };

  const markPreviewStale = (patch: Partial<AdminProduct> = {}) => {
    onChange({ ...draft, ...patch });
    if (!asset) return;
    updateMediaAsset(
      asset.id,
      {
        previewStale: true,
        previewQuality: patch.previewQuality ?? asset.previewQuality,
        watermarkMode: patch.watermarkMode ?? asset.watermarkMode,
        watermarkConfig:
          patch.watermarkOverride ?? asset.watermarkConfig,
      },
      null,
    );
  };

  if (!draft.mediaAssetId) {
    return (
      <AdminCard>
        <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Media
        </h2>
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--admin-surface)] text-[var(--admin-accent)] shadow-[var(--admin-shadow-sm)]">
            <Film className="h-6 w-6" />
          </span>
          <div className="max-w-sm">
            <p className="text-base font-semibold text-[var(--admin-text)]">
              Upload your master video
            </p>
            <p className="mt-2 text-sm text-[var(--admin-muted)]">
              RHYTHM will generate the customer preview and thumbnail frames.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <AdminButton variant="primary" onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload Video
            </AdminButton>
            <AdminButton variant="secondary" onClick={() => setPickerOpen(true)}>
              <Library className="h-4 w-4" />
              Choose from Media Library
            </AdminButton>
          </div>
          <ul className="space-y-1.5 text-left text-xs text-[var(--admin-muted)]">
            {[
              "Original downloadable file",
              "Watermarked customer preview",
              "Thumbnail frames",
            ].map((label) => (
              <li key={label} className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-[var(--admin-success)]" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <UploadMediaModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          onUploaded={(ids) => {
            if (ids[0]) attach(ids[0]);
            setUploadOpen(false);
          }}
        />
        <MediaLibraryPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={attach}
        />
      </AdminCard>
    );
  }

  if (!asset) {
    return (
      <AdminCard>
        <h2 className="mb-4 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Media
        </h2>
        <p className="text-sm text-[var(--admin-muted)]">Loading media asset…</p>
      </AdminCard>
    );
  }

  const wmMode = draft.watermarkMode ?? asset.watermarkMode ?? "global";
  const quality = draft.previewQuality ?? asset.previewQuality ?? "optimized";
  const thumbMode = draft.thumbnailMode ?? asset.thumbnail.source ?? "frame";
  const override = draft.watermarkOverride ?? asset.watermarkConfig ?? {};
  const activeWm = mergeWatermarkConfig(mediaSettings.watermark, wmMode, override);
  const thumbUrl = resolveMediaThumbnail(asset);
  const generating =
    regenBusy ||
    asset.processingSteps.previewGenerating ||
    asset.preview.status === "processing";
  const previewSrc =
    !generating &&
    asset.previewPlayback === "generated" &&
    asset.preview.url &&
    asset.preview.url !== asset.master.url
      ? asset.preview.url
      : getSessionObjectUrl(asset.id, "preview") &&
          asset.previewPlayback === "generated"
        ? getSessionObjectUrl(asset.id, "preview")!
        : "";

  return (
    <div className="space-y-4">
      {/* ——— MASTER VIDEO ——— */}
      <AdminCard>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Master Video
            </h2>
            <p className="text-[11px] text-[var(--admin-muted)]">
              Original / Downloadable Asset
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => setReplaceUploadOpen(true)}
            >
              <Upload className="h-3.5 w-3.5" />
              {asset.hasLocalBlob ? "Replace master" : "Upload master"}
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
              Change video
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={detach}>
              Detach
            </AdminButton>
            <Link
              href={`/admin/media/${asset.id}`}
              className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
            >
              View in Media Library
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row">
          <div className="relative h-48 w-32 shrink-0 overflow-hidden rounded-xl bg-[var(--admin-surface-2)] shadow-[var(--admin-shadow-sm)]">
            <MediaPreviewPlayer asset={asset} variant="card" preferSource="master" />
          </div>
          <div className="flex gap-3">
            <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
              <AdminThumb src={thumbUrl} alt="" sizes="64px" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {!asset.hasLocalBlob ? (
                <p className="rounded-lg bg-[var(--admin-warning)]/15 px-3 py-2 text-xs text-[var(--admin-warning)]">
                  No master video in local storage for this product. Upload a
                  master to generate the watermarked customer preview used on
                  the storefront.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--admin-text)]">
                  {asset.originalFileName}
                </p>
                <AdminBadge
                  tone={
                    asset.processingStatus === "ready"
                      ? "success"
                      : asset.processingStatus === "failed"
                        ? "danger"
                        : "info"
                  }
                >
                  {asset.processingStatus.toUpperCase()}
                </AdminBadge>
              </div>
              <p className="text-xs text-[var(--admin-muted)]">
                {asset.master.duration} · {asset.master.resolution} ·{" "}
                {asset.master.sizeLabel}
              </p>
              <p className="text-[11px] text-[var(--admin-muted)]">
                Protected download · not public
              </p>
            </div>
          </div>
        </div>
      </AdminCard>

      {/* ——— CUSTOMER PREVIEW ——— */}
      <AdminCard>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Customer Preview
            </h2>
            <p className="text-[11px] text-[var(--admin-muted)]">
              Customer-facing Preview
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              onClick={() => setWmPreviewOpen((v) => !v)}
            >
              Preview Watermark
            </AdminButton>
            <AdminButton
              variant="ghost"
              size="sm"
              disabled={regenBusy}
              onClick={() => void regeneratePreview()}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${regenBusy ? "animate-spin" : ""}`} />
              Regenerate Preview
            </AdminButton>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          <CustomerPreviewPlayer
            src={previewSrc}
            poster={thumbUrl || undefined}
            generating={generating}
          />
          <div className="min-w-0 flex-1 space-y-3">
            {asset.previewStale ? (
              <p className="rounded-lg bg-[var(--admin-warning)]/15 px-3 py-2 text-xs text-[var(--admin-warning)]">
                Settings changed — regenerate preview to bake the new quality /
                watermark into the customer file.
              </p>
            ) : null}
            {regenProgress != null ? (
              <p className="text-xs text-[var(--admin-muted)]">
                Encoding… {regenProgress}%
              </p>
            ) : null}
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">Quality</dt>
                <dd className="font-medium capitalize text-[var(--admin-text)]">
                  {quality}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">Resolution</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.preview.resolution || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">Duration</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.duration}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">Watermark</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.preview.watermarkApplied
                    ? `Baked · ${wmMode === "global" ? "Global" : "Custom"} · ${activeWm.style} · ${activeWm.opacity}%`
                    : activeWm.enabled
                      ? "Pending bake — regenerate"
                      : "Off"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">
                  Master file size
                </dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.sizeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-[var(--admin-muted)]">
                  Preview file size
                </dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.preview.sizeLabel ||
                    (generating ? "Generating…" : "—")}
                </dd>
              </div>
            </dl>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Pipeline
              </p>
              <ProcessingStepsList
                steps={asset.processingSteps}
                status={asset.processingStatus}
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Preview quality
              </p>
              <div className="flex flex-wrap gap-2">
                {(["standard", "optimized", "high"] as PreviewQuality[]).map((q) => (
                  <label
                    key={q}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5 text-xs capitalize"
                  >
                    <input
                      type="radio"
                      name="preview-quality"
                      checked={quality === q}
                      onChange={() => {
                        markPreviewStale({ previewQuality: q });
                      }}
                    />
                    {q}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-[var(--admin-muted)]">
                Standard ≈360p · Optimized ≈540p · High ≈720p — all below master,
                with reduced bitrate. Regenerate to apply.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Watermark mode
              </p>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant={wmMode === "global" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    markPreviewStale({ watermarkMode: "global" });
                  }}
                >
                  Global Watermark
                </AdminButton>
                <AdminButton
                  variant={wmMode === "custom" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => {
                    markPreviewStale({ watermarkMode: "custom" });
                  }}
                >
                  Custom Watermark
                </AdminButton>
              </div>
            </div>

            {wmMode === "custom" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <AdminField label="Style">
                  <AdminSelect
                    value={(override.style as WatermarkStyle) || activeWm.style}
                    onChange={(e) => {
                      const style = e.target.value as WatermarkStyle;
                      const next = { ...override, style };
                      markPreviewStale({ watermarkOverride: next });
                    }}
                  >
                    <option value="diagonal">Diagonal</option>
                    <option value="center">Center</option>
                    <option value="corner">Corner</option>
                    <option value="custom">Custom</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Opacity">
                  <AdminInput
                    type="number"
                    min={0}
                    max={100}
                    value={override.opacity ?? activeWm.opacity}
                    onChange={(e) => {
                      const opacity = Number(e.target.value);
                      const next = { ...override, opacity };
                      markPreviewStale({ watermarkOverride: next });
                    }}
                  />
                </AdminField>
                <AdminField label="Size">
                  <AdminSelect
                    value={(override.size as WatermarkSize) || activeWm.size}
                    onChange={(e) => {
                      const size = e.target.value as WatermarkSize;
                      const next = { ...override, size };
                      markPreviewStale({ watermarkOverride: next });
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </AdminSelect>
                </AdminField>
                <AdminField label="Movement">
                  <AdminSelect
                    value={
                      (override.movement as WatermarkMovement) || activeWm.movement
                    }
                    onChange={(e) => {
                      const movement = e.target.value as WatermarkMovement;
                      const next = { ...override, movement };
                      markPreviewStale({ watermarkOverride: next });
                    }}
                  >
                    <option value="static">Static</option>
                    <option value="subtle">Subtle Movement</option>
                    <option value="dynamic">Dynamic</option>
                    <option value="continuous-diagonal">
                      Continuous Diagonal Movement
                    </option>
                  </AdminSelect>
                </AdminField>
              </div>
            ) : null}

            {wmPreviewOpen ? (
              <div className="rounded-xl border border-[var(--admin-border)] p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Watermark layout reference (baked into file on regenerate)
                </p>
                <div className="relative mx-auto aspect-[9/16] max-h-72 overflow-hidden rounded-xl bg-zinc-900">
                  {previewSrc ? (
                    <video
                      src={previewSrc}
                      className="absolute inset-0 h-full w-full object-cover opacity-70"
                      muted
                      loop
                      autoPlay
                      playsInline
                    />
                  ) : null}
                  <WatermarkPreview config={activeWm} variant="overlay" />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>

      {/* ——— THUMBNAIL ——— */}
      <AdminCard>
        <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Thumbnail
        </h2>
        <p className="mb-4 text-[11px] text-[var(--admin-muted)]">
          Clean poster from the master video (never watermarked). Active:{" "}
          <span className="font-semibold text-[var(--admin-text)]">
            {thumbMode === "custom" ? "Custom image" : "Video frame"}
          </span>
          {thumbUrl ? " · saved" : " · not set"}
        </p>

        <div className="mb-4 flex flex-wrap gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs">
            <input
              type="radio"
              checked={thumbMode === "frame"}
              onChange={() => {
                onChange({ ...draft, thumbnailMode: "frame" });
                updateMediaAsset(
                  asset.id,
                  { thumbnail: { ...asset.thumbnail, source: "frame" } },
                  null,
                );
              }}
            />
            Use Video Frame
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-xs">
            <input
              type="radio"
              checked={thumbMode === "custom"}
              onChange={() => onChange({ ...draft, thumbnailMode: "custom" })}
            />
            Upload Custom Image
          </label>
        </div>

        {thumbMode === "frame" ? (
          <ThumbnailFramePicker
            durationSeconds={asset.master.durationSeconds}
            value={scrub || asset.thumbnail.timestamp}
            videoSrc={videoSrcForFrames}
            savedThumbUrl={thumbUrl || undefined}
            onChange={setScrub}
            onSetFrame={setFrame}
            onAutoPick={autoPick}
            busy={frameBusy}
          />
        ) : (
          <div className="space-y-3">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[180px] overflow-hidden rounded-2xl bg-[var(--admin-surface-2)]">
              <AdminThumb src={thumbMode === "custom" ? thumbUrl : ""} alt="" />
            </div>
            <AdminField
              label="Custom thumbnail image"
              hint="PNG, JPEG, or WebP. Replaces the video-frame thumbnail."
            >
              <AdminInput
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await saveMediaBlob(asset.id, file, file.name, "thumb");
                  const url = URL.createObjectURL(file);
                  setSessionObjectUrl(asset.id, url, "thumb");
                  updateMediaAsset(
                    asset.id,
                    {
                      thumbnail: {
                        ...asset.thumbnail,
                        source: "custom",
                        url,
                        timestamp: 0,
                        timestampLabel: formatTimestamp(0),
                      },
                    },
                    "Custom thumbnail set",
                  );
                  onChange({
                    ...draft,
                    thumbnailMode: "custom",
                    media: { ...draft.media, thumbnail: url },
                  });
                }}
              />
            </AdminField>
            {thumbUrl && thumbMode === "custom" ? (
              <AdminButton
                variant="ghost"
                size="sm"
                onClick={() => {
                  updateMediaAsset(
                    asset.id,
                    {
                      thumbnail: {
                        ...asset.thumbnail,
                        source: "frame",
                        url: "",
                      },
                    },
                    "Custom thumbnail removed",
                  );
                  onChange({
                    ...draft,
                    thumbnailMode: "frame",
                    media: { ...draft.media, thumbnail: "" },
                  });
                }}
              >
                Remove custom image
              </AdminButton>
            ) : null}
          </div>
        )}
      </AdminCard>

      <UploadMediaModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={(ids) => {
          if (ids[0]) attach(ids[0]);
          setUploadOpen(false);
        }}
      />
      <UploadMediaModal
        open={replaceUploadOpen}
        replaceAssetId={asset.id}
        onClose={() => setReplaceUploadOpen(false)}
        onUploaded={() => {
          setReplaceUploadOpen(false);
          pushToast("Master upload started — preview will generate automatically");
        }}
      />
      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={attach}
      />
    </div>
  );
}
