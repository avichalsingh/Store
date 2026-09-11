/**
 * Extract a still frame from a video URL (blob: or http) at a given timestamp.
 * Returns a JPEG Blob suitable for IndexedDB persistence and object-URL display.
 *
 * IMPORTANT: Callers must pass the master/original video source — never the
 * watermarked customer preview — so posters stay clean.
 */

export type FrameCaptureResult = {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
};

function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const local = src.startsWith("blob:") || src.startsWith("data:");
    if (!local) {
      video.crossOrigin = "anonymous";
    }

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      fn();
    };

    const onError = () => {
      finish(() => reject(new Error("Failed to load video for frame capture")));
    };

    const onReady = () => {
      finish(() => resolve(video));
    };

    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };

    const timer = window.setTimeout(() => {
      finish(() =>
        reject(new Error("Timeout loading video for frame capture")),
      );
    }, 25000);

    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.src = src;
    video.load();
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = Number.isFinite(video.duration) ? video.duration : time;
    const clamped = Math.min(Math.max(0, time), Math.max(0, duration - 0.05));

    if (Math.abs(video.currentTime - clamped) < 0.02 && video.readyState >= 2) {
      resolve();
      return;
    }

    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("Failed to seek video"));
    };
    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = clamped;
    } catch (err) {
      cleanup();
      reject(err instanceof Error ? err : new Error("Seek failed"));
    }
  });
}

export async function captureVideoFrame(
  videoSrc: string,
  timeSeconds: number,
  options?: { maxWidth?: number; quality?: number },
): Promise<FrameCaptureResult> {
  if (!videoSrc) throw new Error("No video source for frame capture");

  const video = await loadVideo(videoSrc);
  await seekVideo(video, timeSeconds);

  // Ensure a decoded frame is available
  if (video.readyState < 2) {
    await new Promise<void>((resolve) => {
      const onData = () => {
        video.removeEventListener("loadeddata", onData);
        resolve();
      };
      video.addEventListener("loadeddata", onData);
    });
  }

  const maxWidth = options?.maxWidth ?? 720;
  const vw = video.videoWidth || 540;
  const vh = video.videoHeight || 960;
  const scale = Math.min(1, maxWidth / vw);
  const width = Math.max(1, Math.round(vw * scale));
  const height = Math.max(1, Math.round(vh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(video, 0, 0, width, height);

  const quality = options?.quality ?? 0.86;
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Frame encode failed"))),
      "image/jpeg",
      quality,
    );
  });

  const dataUrl = canvas.toDataURL("image/jpeg", quality);

  // Detach video element
  video.removeAttribute("src");
  video.load();

  return { blob, dataUrl, width, height };
}

/** Debounced helper for live scrub previews. */
export function createFramePreviewController() {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;

  return {
    schedule(
      videoSrc: string,
      time: number,
      onResult: (result: FrameCaptureResult | null, error?: string) => void,
      delayMs = 120,
    ) {
      if (timer) clearTimeout(timer);
      const mySeq = ++seq;
      timer = setTimeout(() => {
        void captureVideoFrame(videoSrc, time)
          .then((result) => {
            if (mySeq === seq) onResult(result);
          })
          .catch((err) => {
            if (mySeq === seq) {
              onResult(null, err instanceof Error ? err.message : "Capture failed");
            }
          });
      }, delayMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      seq += 1;
    },
  };
}
