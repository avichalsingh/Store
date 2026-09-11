"use client";

import {
  getCustomerPreviewUrl,
  getMasterUiStatus,
  getMasterVideoUrl,
  getPosterUrl,
  isSeedPlaceholderVideo,
} from "@/admin/lib/mediaPreview";
import { restoreObjectUrl } from "@/admin/services/mediaBlobStore";
import type { MediaAsset } from "@/admin/types";
import { cn } from "@/lib/utils";
import { Film, Loader2, Pause, Play, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  asset: MediaAsset;
  className?: string;
  /** Compact card mode vs detail controls */
  variant?: "card" | "detail";
  /**
   * Which file version to play.
   * - master (default for admin): clean original, no watermark
   * - preview: watermarked customer derivative (detail / storefront inspection)
   */
  preferSource?: "master" | "preview";
  onRetry?: () => void;
};

/**
 * Admin media player for inspecting Master or Preview on the detail page.
 * Media Library cards use MediaLibraryCardVisual (master / clean, no watermark).
 *
 * Default preferSource is "master" for admin inspection. Pass "preview" only when
 * inspecting the customer watermarked derivative on the detail page.
 */
export function MediaPreviewPlayer({
  asset,
  className,
  variant = "card",
  preferSource = "master",
  onRetry,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState(() =>
    preferSource === "preview"
      ? getCustomerPreviewUrl(asset)
      : getMasterVideoUrl(asset),
  );
  const [status, setStatus] = useState(() => getMasterUiStatus(asset));
  const [playing, setPlaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const playingMaster = preferSource === "master";

  const resolveSrc = useCallback(async () => {
    setErrorMsg(null);

    if (
      asset.processingStatus === "uploading" ||
      asset.processingStatus === "queued"
    ) {
      setStatus("loading");
      const live =
        preferSource === "preview"
          ? getCustomerPreviewUrl(asset)
          : getMasterVideoUrl(asset);
      if (live?.startsWith("blob:")) setSrc(live);
      return;
    }

    if (preferSource === "preview") {
      const live = getCustomerPreviewUrl(asset);
      if (live?.startsWith("blob:") || (live && !isSeedPlaceholderVideo(live))) {
        setSrc(live);
        setStatus("ready");
        return;
      }
      if (asset.hasLocalBlob || asset.previewPlayback === "generated") {
        setStatus("restoring");
        const preview = await restoreObjectUrl(asset.id, "preview");
        if (preview) {
          setSrc(preview);
          setStatus("ready");
          return;
        }
      }
      setSrc("");
      setStatus(
        asset.processingSteps.previewGenerating ? "processing" : "empty",
      );
      if (asset.preview.status === "failed") {
        setStatus("failed");
        setErrorMsg(asset.processingError || "Customer preview failed");
      }
      return;
    }

    // ——— MASTER (default for Admin Media Library) ———
    const liveMaster = getMasterVideoUrl(asset);
    if (
      liveMaster?.startsWith("blob:") ||
      (liveMaster && !isSeedPlaceholderVideo(liveMaster))
    ) {
      setSrc(liveMaster);
      setStatus("ready");
      return;
    }

    if (asset.hasLocalBlob) {
      setStatus("restoring");
      const original = await restoreObjectUrl(asset.id, "original");
      if (original) {
        setSrc(original);
        setStatus("ready");
        return;
      }
      setSrc("");
      setStatus("failed");
      setErrorMsg("Original video missing. Re-upload to restore playback.");
      return;
    }

    setSrc("");
    setStatus(getMasterUiStatus(asset));
  }, [asset, preferSource]);

  useEffect(() => {
    void resolveSrc();
  }, [
    resolveSrc,
    asset.id,
    asset.master.url,
    asset.preview.url,
    asset.hasLocalBlob,
    asset.processingStatus,
    asset.previewPlayback,
  ]);

  useEffect(() => {
    setPlaying(false);
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.load();
    }
  }, [src]);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const el = videoRef.current;
    if (!el || !src) return;
    if (el.paused) {
      void el
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          setStatus("failed");
          setErrorMsg("Playback failed");
        });
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const poster = getPosterUrl(asset);
  const isCard = variant === "card";

  if (status === "loading" || status === "restoring") {
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
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        ) : null}
        <Loader2 className="relative h-7 w-7 animate-spin" />
        <p className="relative text-[11px] font-medium uppercase tracking-wide">
          {status === "restoring"
            ? playingMaster
              ? "Loading master"
              : "Loading preview"
            : "Uploading"}
        </p>
      </div>
    );
  }

  if (status === "processing" && !src) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--admin-surface-2)] text-[var(--admin-muted)]",
          className,
        )}
      >
        <Loader2 className="h-7 w-7 animate-spin" />
        <p className="text-[11px] font-medium uppercase tracking-wide">
          {playingMaster ? "Processing…" : "Encoding preview"}
        </p>
      </div>
    );
  }

  if (status === "empty" || (!src && status !== "failed")) {
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
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Film className="h-8 w-8 text-[var(--admin-muted)]" />
        )}
        <div className="relative rounded-lg bg-black/55 px-2.5 py-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white">
            {playingMaster ? "No master video" : "No customer preview"}
          </p>
          <p className="mt-0.5 text-[10px] text-white/80">
            {playingMaster
              ? "Upload a master video to enable playback"
              : "Regenerate preview from the master"}
          </p>
        </div>
      </div>
    );
  }

  if (status === "failed" || errorMsg) {
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
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        ) : null}
        <p className="relative text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-danger)]">
          {playingMaster ? "Master unavailable" : "Preview unavailable"}
        </p>
        <p className="relative text-[10px] text-[var(--admin-muted)]">
          {errorMsg || asset.processingError || "Could not load video"}
        </p>
        <button
          type="button"
          className="relative inline-flex items-center gap-1 rounded-lg bg-[var(--admin-surface)] px-2 py-1 text-[10px] font-medium text-[var(--admin-text)] shadow"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRetry?.();
            void resolveSrc();
          }}
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full bg-black", className)}>
      <video
        ref={videoRef}
        src={src}
        poster={poster || undefined}
        className="h-full w-full object-cover"
        playsInline
        preload="metadata"
        controls={variant === "detail"}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          setStatus("failed");
          setErrorMsg("Video failed to load");
          setPlaying(false);
        }}
        onLoadedData={() => setStatus("ready")}
      />
      {isCard ? (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition hover:opacity-100 focus:opacity-100"
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--admin-text)] shadow">
            {playing ? (
              <Pause className="h-5 w-5" fill="currentColor" />
            ) : (
              <Play className="h-5 w-5" fill="currentColor" />
            )}
          </span>
        </button>
      ) : null}
      <span className="absolute bottom-2 left-2 rounded bg-black/65 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/95">
        {playingMaster ? "Master · original" : "Customer preview"}
      </span>
      {asset.processingSteps.previewGenerating && playingMaster ? (
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90">
          Preview encoding…
        </span>
      ) : null}
    </div>
  );
}
