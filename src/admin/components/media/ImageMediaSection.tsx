"use client";

import { MediaLibraryPickerModal } from "@/admin/components/media/MediaLibraryPickerModal";
import { ProcessingStepsList } from "@/admin/components/media/ProcessingStepsList";
import { UploadMediaModal } from "@/admin/components/media/UploadMediaModal";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import {
  AdminField,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { assetToProductMedia } from "@/admin/lib/mediaAdapter";
import { resolveMediaAssetDisplayUrl } from "@/admin/lib/resolveAiImageMedia";
import { resolveMediaThumbnail } from "@/admin/lib/resolveThumbnails";
import {
  getSessionObjectUrl,
  restoreObjectUrl,
} from "@/admin/services/mediaBlobStore";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct, PreviewQuality } from "@/admin/types";
import { ImageIcon, Library, RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/**
 * Master Image + Preview Image section for AI_IMAGE products.
 * Mirrors the Video ProductMediaSection Master/Preview pattern.
 */
export function ImageMediaSection({
  draft,
  onChange,
}: {
  draft: AdminProduct;
  onChange: (next: AdminProduct) => void;
}) {
  const {
    mediaAssets,
    attachMediaToProduct,
    detachMediaFromProduct,
    updateMediaAsset,
    regenerateMediaPreview,
  } = useAdmin();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [restoredPreviewUrl, setRestoredPreviewUrl] = useState("");
  const [restoredMasterUrl, setRestoredMasterUrl] = useState("");

  const asset = useMemo(() => {
    const found = mediaAssets.find((a) => a.id === draft.mediaAssetId);
    // Ignore wrongly linked video assets — migration heals these on load.
    if (found && found.type !== "image") return undefined;
    return found;
  }, [mediaAssets, draft.mediaAssetId]);

  // Restore preview / master blob URLs after hydration (localStorage strips blob: URLs).
  useEffect(() => {
    if (!asset) {
      setRestoredPreviewUrl("");
      setRestoredMasterUrl("");
      return;
    }
    let cancelled = false;
    const assetId = asset.id;

    const sessionMaster = getSessionObjectUrl(assetId, "original");
    if (sessionMaster) {
      setRestoredMasterUrl(sessionMaster);
    } else if (asset.hasLocalBlob || asset.processingStatus !== "failed") {
      void restoreObjectUrl(assetId, "original").then((url) => {
        if (!cancelled && url) setRestoredMasterUrl(url);
      });
    }

    const live = getSessionObjectUrl(assetId, "preview");
    if (live) {
      setRestoredPreviewUrl(live);
      return () => {
        cancelled = true;
      };
    }
    const shouldRestore =
      asset.previewPlayback === "generated" ||
      asset.preview.watermarkApplied ||
      (Boolean(asset.hasLocalBlob) && asset.processingStatus === "ready");
    if (!shouldRestore) {
      setRestoredPreviewUrl("");
      return () => {
        cancelled = true;
      };
    }
    void restoreObjectUrl(assetId, "preview").then((url) => {
      if (cancelled || !url) return;
      setRestoredPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [
    asset,
    asset?.id,
    asset?.previewPlayback,
    asset?.preview.watermarkApplied,
    asset?.hasLocalBlob,
    asset?.processingStatus,
  ]);

  const masterUrl =
    asset?.master.url ||
    restoredMasterUrl ||
    (asset ? getSessionObjectUrl(asset.id, "original") : "") ||
    "";
  const previewUrl =
    (asset?.preview.url &&
    (asset.previewPlayback === "generated" || asset.preview.watermarkApplied)
      ? asset.preview.url
      : "") ||
    restoredPreviewUrl ||
    "";

  const isProcessing =
    !!asset &&
    (asset.processingStatus === "processing" ||
      asset.processingStatus === "uploaded" ||
      asset.processingStatus === "uploading" ||
      // Seed/migrated masters awaiting watermark bake
      (asset.processingStatus === "ready" &&
        !asset.preview.watermarkApplied &&
        asset.previewPlayback !== "generated" &&
        !previewUrl));
  const isFailed = asset?.processingStatus === "failed";
  const isReady =
    !!asset &&
    !isFailed &&
    !isProcessing &&
    Boolean(previewUrl) &&
    (asset.preview.watermarkApplied ||
      asset.previewPlayback === "generated" ||
      asset.processingStatus === "ready");

  const publicThumb =
    resolveMediaAssetDisplayUrl(asset) ||
    masterUrl ||
    draft.media.thumbnail;

  const attach = (assetId: string) => {
    const a = mediaAssets.find((x) => x.id === assetId);
    if (!a || a.type !== "image") return;

    if (draft.id) {
      attachMediaToProduct(draft.id, assetId);
    }

    onChange({
      ...draft,
      mediaAssetId: assetId,
      media: {
        ...assetToProductMedia(a),
        // Admin draft thumb = clean master (storefront uses asset.preview)
        thumbnail: a.master.url || a.thumbnail.url || "",
      },
      resolution: a.master.resolution || draft.resolution,
      format: draft.format || "PNG",
      watermarkMode: a.watermarkMode,
      previewQuality: a.previewQuality,
      // Clear legacy multi-image list — one master per product
      aiImageData: {
        ...(draft.aiImageData ?? { images: [] }),
        images: [],
      },
      updatedAt: new Date().toISOString(),
    });
  };

  const detach = () => {
    if (draft.id && draft.mediaAssetId) {
      detachMediaFromProduct(draft.id);
    }
    onChange({
      ...draft,
      mediaAssetId: undefined,
      media: { ...draft.media, thumbnail: "" },
      updatedAt: new Date().toISOString(),
    });
  };

  const regenerate = () => {
    if (!asset) return;
    setRegenBusy(true);
    regenerateMediaPreview(asset.id);
  };

  useEffect(() => {
    if (!regenBusy || !asset) return;
    if (
      asset.processingStatus === "ready" ||
      asset.processingStatus === "failed"
    ) {
      setRegenBusy(false);
    }
  }, [asset, asset?.processingStatus, regenBusy]);

  // When preview becomes ready, keep draft catalog thumb on clean master.
  useEffect(() => {
    if (!asset || asset.processingStatus !== "ready") return;
    const nextThumb =
      asset.master.url ||
      restoredMasterUrl ||
      (asset.thumbnail.url !== asset.preview.url ? asset.thumbnail.url : "") ||
      "";
    if (!nextThumb || draft.media.thumbnail === nextThumb) return;
    onChange({
      ...draft,
      media: { ...draft.media, thumbnail: nextThumb },
    });
    // Intentionally omit draft/onChange to avoid loops — only react to asset readiness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    asset?.id,
    asset?.processingStatus,
    asset?.master.url,
    asset?.thumbnail.url,
    asset?.preview.url,
    restoredMasterUrl,
  ]);

  const setQuality = (previewQuality: PreviewQuality) => {
    if (!asset) return;
    updateMediaAsset(
      asset.id,
      { previewQuality, previewStale: true },
      "Preview quality updated — regenerate to apply",
    );
    onChange({ ...draft, previewQuality });
  };

  if (!asset) {
    return (
      <AdminCard>
        <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Image media
        </h2>
        <p className="mb-4 text-xs text-[var(--admin-muted)]">
          Each image product has one Master Image and one generated Preview
          Image (watermarked). Upload or select from the Media Library.
        </p>
        <div className="flex flex-wrap gap-2">
          <AdminButton
            variant="primary"
            size="sm"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-3.5 w-3.5" /> Upload new image
          </AdminButton>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={() => setPickerOpen(true)}
          >
            <Library className="h-3.5 w-3.5" /> Select from Media Library
          </AdminButton>
        </div>
        <MediaLibraryPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          assetType="image"
          title="Select master image"
          onSelect={attach}
        />
        <UploadMediaModal
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          mode="image"
          onUploaded={(ids) => {
            if (ids[0]) attach(ids[0]);
          }}
        />
      </AdminCard>
    );
  }

  const statusTone = isFailed
    ? ("danger" as const)
    : ("success" as const);

  const previewBadge = isReady
    ? "READY"
    : isFailed
      ? "FAILED"
      : "PROCESSING";

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Master image
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Original · full quality · no watermark · downloadable after purchase
            </p>
          </div>
          <AdminBadge tone={statusTone}>
            {isFailed && !masterUrl ? "FAILED" : "READY"}
          </AdminBadge>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative h-40 w-40 overflow-hidden rounded-xl bg-[var(--admin-surface-2)]">
            <AdminThumb
              src={masterUrl || resolveMediaThumbnail(asset)}
              alt=""
              sizes="160px"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-[var(--admin-text)]">
              {asset.name}
            </p>
            <p className="text-xs text-[var(--admin-muted)]">
              {[
                asset.originalFileName,
                asset.master.resolution,
                asset.master.sizeLabel,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => setPickerOpen(true)}
              >
                Change image
              </AdminButton>
              <AdminButton
                size="sm"
                variant="secondary"
                onClick={() => setUploadOpen(true)}
              >
                <Upload className="h-3.5 w-3.5" /> Upload new
              </AdminButton>
              <AdminButton size="sm" variant="ghost" onClick={detach}>
                Detach
              </AdminButton>
              <Link href={`/admin/media/${asset.id}`}>
                <AdminButton size="sm" variant="ghost">
                  Open in library
                </AdminButton>
              </Link>
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Preview image
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              Smaller · optimized · watermark baked in · used as storefront
              thumbnail
            </p>
          </div>
          <AdminBadge
            tone={
              isReady ? "success" : isFailed ? "danger" : "info"
            }
          >
            {previewBadge}
          </AdminBadge>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-xl bg-[var(--admin-surface-2)]">
            {previewUrl && isReady ? (
              <AdminThumb src={previewUrl} alt="" sizes="160px" />
            ) : isProcessing ? (
              <div className="flex flex-col items-center gap-2 text-xs text-[var(--admin-muted)]">
                <RefreshCw className="h-6 w-6 animate-spin text-[var(--admin-accent)]" />
                Encoding…
              </div>
            ) : isFailed ? (
              <div className="flex flex-col items-center gap-2 px-3 text-center text-xs text-[var(--admin-danger)]">
                <ImageIcon className="h-6 w-6" />
                Preview failed
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-3 text-center text-xs text-[var(--admin-muted)]">
                <ImageIcon className="h-6 w-6" />
                Preview not ready
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            {(isProcessing || isReady) && !isFailed ? (
              <ProcessingStepsList
                steps={asset.processingSteps}
                status={isReady ? "ready" : asset.processingStatus}
                kind="image"
              />
            ) : null}
            {asset.preview.watermarkApplied && isReady ? (
              <p className="text-xs text-[var(--admin-success)]">
                Watermark baked into preview file
              </p>
            ) : null}
            {isFailed && asset.processingError ? (
              <p className="text-xs text-[var(--admin-danger)]">
                {asset.processingError}
              </p>
            ) : null}
            <AdminField label="Preview quality">
              <AdminSelect
                value={asset.previewQuality ?? "optimized"}
                onChange={(e) =>
                  setQuality(e.target.value as PreviewQuality)
                }
                disabled={isProcessing || regenBusy}
              >
                <option value="standard">Standard</option>
                <option value="optimized">Optimized</option>
                <option value="high">High</option>
              </AdminSelect>
            </AdminField>
            <AdminButton
              size="sm"
              variant={isFailed ? "primary" : "secondary"}
              disabled={regenBusy || isProcessing || (!masterUrl && !asset.hasLocalBlob)}
              onClick={regenerate}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${regenBusy || isProcessing ? "animate-spin" : ""}`}
              />
              {isFailed ? "Retry preview generation" : "Regenerate preview"}
            </AdminButton>
            <p className="text-[11px] text-[var(--admin-muted)]">
              Retry regenerates only the Preview Image — the Master Image is
              never modified or watermarked.
              {publicThumb && isReady ? " · Catalog thumbnail ready ✓" : ""}
            </p>
          </div>
        </div>
      </AdminCard>

      <MediaLibraryPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        assetType="image"
        title="Select master image"
        onSelect={attach}
      />
      <UploadMediaModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        mode="image"
        onUploaded={(ids) => {
          if (ids[0]) attach(ids[0]);
        }}
      />
    </div>
  );
}
