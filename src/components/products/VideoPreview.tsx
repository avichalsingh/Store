"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoverImage } from "@/components/ui/CoverImage";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

type VideoPreviewProps = {
  thumbnail: string;
  title: string;
  previewVideo?: string;
  aspect?: "vertical" | "wide";
  className?: string;
  showPlay?: boolean;
  autoPlayOnHover?: boolean;
  priority?: boolean;
  /** Occasional idle pulse on the play button (product hero) */
  idlePlayPulse?: boolean;
};

/**
 * Customer-facing preview player.
 * Uses ONLY the generated preview derivative — never the master.
 */
export function VideoPreview({
  thumbnail,
  title,
  previewVideo,
  aspect = "vertical",
  className,
  showPlay = true,
  autoPlayOnHover = true,
  priority = false,
  idlePlayPulse = false,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovering, setHovering] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduced = usePrefersReducedMotion();
  const clickToPlay = !autoPlayOnHover;

  // Reset when the preview source changes
  useEffect(() => {
    setPlaying(false);
    setLoading(false);
    setError(null);
    setHovering(false);
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [previewVideo]);

  // Card hover-to-preview behavior
  useEffect(() => {
    if (!autoPlayOnHover) return;
    const video = videoRef.current;
    if (!video || !previewVideo) return;

    if (hovering) {
      setError(null);
      void video.play().then(
        () => setPlaying(true),
        () => {
          setPlaying(false);
          setError("Preview unavailable");
        },
      );
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [hovering, previewVideo, autoPlayOnHover]);

  const startPlayback = async () => {
    if (!previewVideo) {
      setError("No customer preview available yet");
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    try {
      // preload="none" means we must explicitly load before first play
      if (video.readyState < 2) {
        video.load();
        await new Promise<void>((resolve, reject) => {
          const onReady = () => {
            cleanup();
            resolve();
          };
          const onFail = () => {
            cleanup();
            reject(new Error("Failed to load preview"));
          };
          const cleanup = () => {
            video.removeEventListener("loadeddata", onReady);
            video.removeEventListener("canplay", onReady);
            video.removeEventListener("error", onFail);
          };
          video.addEventListener("loadeddata", onReady, { once: true });
          video.addEventListener("canplay", onReady, { once: true });
          video.addEventListener("error", onFail, { once: true });
          // Safety timeout
          window.setTimeout(() => {
            if (video.readyState >= 2) {
              cleanup();
              resolve();
            }
          }, 8000);
        });
      }
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setError("Could not play preview video");
    } finally {
      setLoading(false);
    }
  };

  const stopPlayback = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setPlaying(false);
  };

  const toggleHeroPlayback = () => {
    if (!clickToPlay) return;
    if (playing) stopPlayback();
    else void startPlayback();
  };

  const showVideoLayer = Boolean(previewVideo) && (playing || (autoPlayOnHover && hovering));

  return (
    <div
      className={cn(
        "group/preview relative overflow-hidden bg-surface-2",
        aspect === "vertical" ? "aspect-[9/16]" : "aspect-video",
        className,
      )}
      onMouseEnter={() => {
        if (autoPlayOnHover) setHovering(true);
      }}
      onMouseLeave={() => {
        if (autoPlayOnHover) setHovering(false);
      }}
      onClick={clickToPlay ? toggleHeroPlayback : undefined}
      onContextMenu={(e) => e.preventDefault()}
      role={clickToPlay ? "button" : undefined}
      tabIndex={clickToPlay ? 0 : undefined}
      aria-label={
        clickToPlay
          ? playing
            ? `Pause preview of ${title}`
            : `Play preview of ${title}`
          : undefined
      }
      onKeyDown={(e) => {
        if (clickToPlay && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          toggleHeroPlayback();
        }
      }}
    >
      <div className="absolute inset-0 origin-center transition-transform duration-500 ease-out group-hover/preview:scale-[1.04] group-hover/preview:brightness-110">
        <CoverImage
          src={thumbnail}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>

      {previewVideo ? (
        <video
          ref={videoRef}
          src={previewVideo}
          muted
          loop
          playsInline
          preload={clickToPlay ? "metadata" : "none"}
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onPlaying={() => {
            setPlaying(true);
            setLoading(false);
            setError(null);
          }}
          onPause={() => {
            if (clickToPlay) setPlaying(false);
          }}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setLoading(false);
            setError("Preview failed to load");
          }}
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
          className={cn(
            "absolute inset-0 z-[1] h-full w-full origin-center object-cover transition duration-300",
            showVideoLayer ? "scale-[1.02] opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80" />

      {showPlay && !playing ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-[3] flex items-center justify-center transition duration-300",
            hovering || clickToPlay ? "opacity-100" : "opacity-80",
          )}
        >
          <span
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white shadow-lg backdrop-blur-md ring-1 ring-white/25 transition duration-300 group-hover/preview:scale-110 group-hover/preview:bg-accent group-hover/preview:ring-accent/40",
              idlePlayPulse && !reduced && !loading && "animate-play-idle",
            )}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {idlePlayPulse && !reduced ? (
                  <span className="pointer-events-none absolute inset-0 animate-play-ripple rounded-full ring-2 ring-white/30" />
                ) : null}
                <Play size={18} fill="currentColor" className="relative ml-0.5" />
              </>
            )}
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[4] rounded-lg bg-black/75 px-3 py-2 text-center text-[11px] font-medium text-white">
          {error}
          {!previewVideo
            ? " — regenerate the customer preview in Admin."
            : null}
        </div>
      ) : null}

      <span className="sr-only">{title}</span>
    </div>
  );
}
