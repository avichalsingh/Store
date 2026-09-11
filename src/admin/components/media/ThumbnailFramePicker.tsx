"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { formatDuration, formatTimestamp } from "@/admin/lib/mediaAdapter";
import {
  captureVideoFrame,
  createFramePreviewController,
} from "@/admin/services/frameCapture";
import { ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function ThumbnailFramePicker({
  durationSeconds,
  value,
  videoSrc,
  savedThumbUrl,
  onChange,
  onSetFrame,
  onAutoPick,
  busy = false,
}: {
  durationSeconds: number;
  value: number;
  /** Playable master video used to extract clean (unwatermarked) frames */
  videoSrc?: string;
  /** Currently saved thumbnail (shown when not scrubbing) */
  savedThumbUrl?: string;
  onChange: (seconds: number) => void;
  onSetFrame: (seconds: number) => void | Promise<void>;
  onAutoPick: () => void | Promise<void>;
  busy?: boolean;
}) {
  const max = Math.max(0.1, durationSeconds);
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const [livePreview, setLivePreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveUrlRef = useRef<string | null>(null);

  const controller = useMemo(() => createFramePreviewController(), []);

  useEffect(() => {
    return () => {
      controller.cancel();
      if (liveUrlRef.current?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(liveUrlRef.current);
        } catch {
          /* ignore */
        }
      }
    };
  }, [controller]);

  useEffect(() => {
    if (!videoSrc) {
      setLivePreview(null);
      setError(null);
      return;
    }

    setCapturing(true);
    setError(null);
    controller.schedule(videoSrc, value, (result, err) => {
      setCapturing(false);
      if (!result) {
        setError(err || "Could not capture frame");
        return;
      }
      if (liveUrlRef.current?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(liveUrlRef.current);
        } catch {
          /* ignore */
        }
      }
      // Prefer object URL from blob so we don't keep huge data URLs in state long-term
      const url = URL.createObjectURL(result.blob);
      liveUrlRef.current = url;
      setLivePreview(url);
    });
  }, [videoSrc, value, controller]);

  const displayUrl = livePreview || savedThumbUrl || "";

  const nudge = (delta: number) => {
    const next = Math.min(max, Math.max(0, Math.round((value + delta) * 10) / 10));
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[220px] overflow-hidden rounded-2xl bg-[var(--admin-surface-2)] shadow-[var(--admin-shadow-sm)]">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-xs text-[var(--admin-muted)]">
            {videoSrc ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading frame…</span>
              </>
            ) : (
              <span>No video available for frame preview</span>
            )}
          </div>
        )}
        {(capturing || busy) && displayUrl ? (
          <div className="absolute right-2 top-2 rounded-full bg-black/55 p-1.5 text-white">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
          <p className="text-[10px] font-medium text-white/90">Selected frame</p>
          <p className="font-mono text-xs text-white">{formatTimestamp(value)}</p>
        </div>
      </div>

      {error ? (
        <p className="text-center text-[11px] text-[var(--admin-danger)]">{error}</p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] text-[var(--admin-muted)]">
          <span>{formatDuration(0)}</span>
          <span className="font-mono text-[var(--admin-text)]">{formatTimestamp(value)}</span>
          <span>{formatDuration(durationSeconds)}</span>
        </div>
        <div className="flex items-center gap-2">
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => nudge(-0.1)}
            aria-label="Previous frame"
          >
            <ChevronLeft className="h-4 w-4" />
          </AdminButton>
          <div className="relative flex-1 pt-1">
            <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[var(--admin-border)]" />
            <div
              className="pointer-events-none absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[var(--admin-accent)]"
              style={{ width: `${pct}%` }}
            />
            <input
              type="range"
              min={0}
              max={max}
              step={0.1}
              value={value}
              onChange={(e) => onChange(Number(e.target.value))}
              className="relative z-10 w-full accent-[var(--admin-accent)]"
              aria-label="Video timeline"
            />
          </div>
          <AdminButton
            variant="ghost"
            size="sm"
            onClick={() => nudge(0.1)}
            aria-label="Next frame"
          >
            <ChevronRight className="h-4 w-4" />
          </AdminButton>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminButton
          variant="primary"
          size="sm"
          disabled={!videoSrc || busy}
          onClick={() => void onSetFrame(value)}
        >
          {busy ? "Saving…" : "Set This Frame as Thumbnail"}
        </AdminButton>
        <AdminButton
          variant="secondary"
          size="sm"
          disabled={!videoSrc || busy}
          onClick={() => void onAutoPick()}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Auto Pick Frame
        </AdminButton>
        {videoSrc ? (
          <AdminButton
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              void captureVideoFrame(videoSrc, value).then((r) => {
                if (liveUrlRef.current?.startsWith("blob:")) {
                  try {
                    URL.revokeObjectURL(liveUrlRef.current);
                  } catch {
                    /* ignore */
                  }
                }
                const url = URL.createObjectURL(r.blob);
                liveUrlRef.current = url;
                setLivePreview(url);
              });
            }}
          >
            Refresh Preview
          </AdminButton>
        ) : null}
      </div>
    </div>
  );
}
