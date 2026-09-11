"use client";

import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import {
  getMasterVideoUrl,
  getPosterUrl,
  isUsableAdminMediaUrl,
  isVideoUrl,
  resolveAdminMasterDisplayUrl,
} from "@/admin/lib/mediaPreview";
import {
  getSessionObjectUrl,
  restoreObjectUrl,
} from "@/admin/services/mediaBlobStore";
import type { MediaAsset } from "@/admin/types";
import { cn } from "@/lib/utils";
import { Film, ImageIcon, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  asset: MediaAsset;
  className?: string;
  /** Retry preview generation (parent wires regenerateMediaPreview). */
  onRetryPreview?: () => void;
};

function isActivelyGenerating(asset: MediaAsset): boolean {
  return (
    asset.processingStatus === "processing" ||
    asset.processingStatus === "uploading" ||
    asset.processingStatus === "queued" ||
    asset.processingSteps.previewGenerating
  );
}

function syncMasterCandidate(asset: MediaAsset, isImage: boolean): string {
  const fromFields = resolveAdminMasterDisplayUrl(asset);
  if (fromFields) return fromFields;
  if (isImage) {
    return getSessionObjectUrl(asset.id, "original") || "";
  }
  return (
    getMasterVideoUrl(asset) ||
    getSessionObjectUrl(asset.id, "original") ||
    ""
  );
}

/**
 * Media Library card visual — ADMIN only.
 * Always shows the clean Master (no watermark). Watermarked Preview is for
 * storefront / customer contexts only.
 */
export function MediaLibraryCardVisual({
  asset,
  className,
  onRetryPreview,
}: Props) {
  const isImage = asset.type === "image";
  const [masterSrc, setMasterSrc] = useState(() =>
    syncMasterCandidate(asset, isImage),
  );
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const live = syncMasterCandidate(asset, isImage);
    if (live) {
      setMasterSrc(live);
      setResolving(false);
      // Still refresh from IDB when we only have a field path — original blob
      // may be cleaner / more current — but don't blank the card while waiting.
    }

    const shouldProbeIdb =
      Boolean(asset.hasLocalBlob) ||
      !live ||
      live.startsWith("blob:") ||
      asset.processingStatus === "ready" ||
      asset.processingStatus === "uploaded";

    if (!shouldProbeIdb) {
      if (!live) setMasterSrc("");
      setResolving(false);
      return;
    }

    if (!live) setResolving(true);

    void restoreObjectUrl(asset.id, "original").then((url) => {
      if (cancelled) return;
      if (url) {
        setMasterSrc(url);
      } else if (!live) {
        // Keep any sync fallback (thumbnail / legacy) — never force empty when
        // a durable source field exists on the asset.
        setMasterSrc(syncMasterCandidate(asset, isImage));
      }
      setResolving(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    asset,
    asset.id,
    asset.master.url,
    asset.thumbnail.url,
    asset.preview.url,
    asset.hasLocalBlob,
    asset.type,
    asset.processingStatus,
    isImage,
  ]);

  const generating = isActivelyGenerating(asset);
  const isFailed = asset.processingStatus === "failed";

  // Clean poster / still — prefer fields that are not the watermarked preview.
  const watermarkedPreview =
    Boolean(asset.preview.url) &&
    (asset.preview.watermarkApplied ||
      asset.previewPlayback === "generated");
  const posterCandidate =
    getPosterUrl(asset) ||
    (isUsableAdminMediaUrl(asset.thumbnail.url) ? asset.thumbnail.url : "") ||
    "";
  const poster =
    posterCandidate &&
    !(watermarkedPreview && posterCandidate === asset.preview.url)
      ? posterCandidate
      : isUsableAdminMediaUrl(asset.master.url) &&
          !(watermarkedPreview && asset.master.url === asset.preview.url)
        ? asset.master.url
        : isImage && isUsableAdminMediaUrl(posterCandidate)
          ? posterCandidate
          : "";

  const showMaster = Boolean(masterSrc);

  if (resolving && !showMaster && !poster) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
          className,
        )}
      >
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-[11px] font-medium uppercase tracking-wide">
          Loading master
        </p>
      </div>
    );
  }

  // Prefer clean master whenever available (even while preview is generating).
  if (showMaster) {
    const looksLikeVideo =
      !isImage &&
      (isVideoUrl(masterSrc) ||
        masterSrc.startsWith("blob:") ||
        masterSrc.startsWith("data:video"));

    if (isImage || !looksLikeVideo) {
      return (
        <div className={cn("relative h-full w-full", className)}>
          <AdminThumb
            src={masterSrc}
            alt=""
            sizes="320px"
            rounded="rounded-none"
            className="h-full w-full"
          />
          {generating ? (
            <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90">
              Generating preview…
            </span>
          ) : null}
        </div>
      );
    }

    return (
      <div className={cn("relative h-full w-full bg-black", className)}>
        <video
          src={masterSrc}
          className="h-full w-full object-cover"
          muted
          playsInline
          loop
          preload="metadata"
          poster={poster || undefined}
        />
        {generating ? (
          <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90">
            Generating preview…
          </span>
        ) : null}
      </div>
    );
  }

  if (generating) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
          className,
        )}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        ) : null}
        <Loader2 className="relative h-7 w-7 animate-spin text-[var(--admin-accent)]" />
        <p className="relative text-[11px] font-medium uppercase tracking-wide">
          Generating preview…
        </p>
      </div>
    );
  }

  if (isFailed) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--admin-surface-2)] px-3 text-center",
          className,
        )}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={poster}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
          />
        ) : isImage ? (
          <ImageIcon className="h-8 w-8 text-[var(--admin-muted)]" />
        ) : (
          <Film className="h-8 w-8 text-[var(--admin-muted)]" />
        )}
        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-danger)]">
          Preview failed
        </p>
        <p className="relative text-[10px] text-[var(--admin-muted)]">
          {asset.processingError || "Preview generation failed"}
        </p>
        {onRetryPreview ? (
          <button
            type="button"
            className="relative inline-flex items-center gap-1 rounded-lg bg-[var(--admin-surface)] px-2 py-1 text-[10px] font-medium text-[var(--admin-text)] shadow"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRetryPreview();
            }}
          >
            <RefreshCw className="h-3 w-3" />
            Retry preview generation
          </button>
        ) : null}
      </div>
    );
  }

  // Seed / catalog poster (clean still) when no master blob is present.
  if (poster) {
    return (
      <div className={cn("relative h-full w-full", className)}>
        <AdminThumb
          src={poster}
          alt=""
          sizes="320px"
          rounded="rounded-none"
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--admin-surface-2)] px-3 text-center text-[var(--admin-muted)]",
        className,
      )}
    >
      {isImage ? (
        <ImageIcon className="h-8 w-8" />
      ) : (
        <Film className="h-8 w-8" />
      )}
      <p className="text-[11px] font-medium uppercase tracking-wide">
        No master file
      </p>
      <p className="text-[10px]">Upload a master to manage this asset</p>
    </div>
  );
}
