/**
 * Client-side customer preview encoder.
 *
 * Master video → downscaled + bitrate-limited MediaRecorder output
 * with watermark pixels baked into every frame.
 *
 * Master image → downscaled canvas JPEG/WebP with watermark pixels baked in.
 *
 * This never mutates the master blob.
 */

import type {
  PreviewQuality,
  WatermarkConfig,
  WatermarkSize,
} from "@/admin/types";
import {
  getContinuousDiagonalPosition,
  getWatermarkDriftY,
} from "@/admin/lib/watermarkMotion";

export type PreviewEncodeProfile = {
  id: PreviewQuality;
  label: string;
  maxWidth: number;
  maxHeight: number;
  /** Target video bitrate for MediaRecorder */
  videoBitsPerSecond: number;
  fps: number;
};

export const PREVIEW_ENCODE_PROFILES: Record<
  PreviewQuality,
  PreviewEncodeProfile
> = {
  standard: {
    id: "standard",
    label: "Standard",
    maxWidth: 360,
    maxHeight: 640,
    videoBitsPerSecond: 350_000,
    fps: 24,
  },
  optimized: {
    id: "optimized",
    label: "Optimized",
    maxWidth: 540,
    maxHeight: 960,
    videoBitsPerSecond: 850_000,
    fps: 24,
  },
  high: {
    id: "high",
    label: "High",
    maxWidth: 720,
    maxHeight: 1280,
    videoBitsPerSecond: 1_600_000,
    fps: 30,
  },
};

export type PreviewEncodeResult = {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  resolution: string;
  sizeBytes: number;
  durationSeconds: number;
  quality: PreviewQuality;
  watermarkApplied: boolean;
};

function pickRecorderMime(): string {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const type of candidates) {
    if (
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(type)
    ) {
      return type;
    }
  }
  return "video/webm";
}

function fitContain(
  srcW: number,
  srcH: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  if (srcW <= 0 || srcH <= 0) {
    return { width: maxW, height: maxH };
  }
  // Never upscale
  const capW = Math.min(srcW, maxW);
  const capH = Math.min(srcH, maxH);
  const scale = Math.min(capW / srcW, capH / srcH);
  return {
    width: Math.max(2, Math.round((srcW * scale) / 2) * 2),
    height: Math.max(2, Math.round((srcH * scale) / 2) * 2),
  };
}

function fontPx(size: WatermarkSize, canvasH: number): number {
  const base =
    size === "small" ? 0.028 : size === "large" ? 0.055 : 0.04;
  return Math.max(12, Math.round(canvasH * base));
}

/**
 * Load an image for canvas encode.
 * Never set crossOrigin on blob:/data: URLs — that can hang indefinitely in
 * some browsers (onload/onerror never fire). Always time out so callers can
 * mark preview generation FAILED instead of staying in PROCESSING forever.
 */
async function loadImage(
  url: string,
  timeoutMs = 25000,
): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    const local = url.startsWith("blob:") || url.startsWith("data:");
    // Cross-origin only for http(s) so canvas is not tainted when possible.
    if (!local) {
      img.crossOrigin = "anonymous";
    }
    let settled = false;
    const finish = (value: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    try {
      img.src = url;
    } catch {
      finish(null);
    }
  });
}

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: WatermarkConfig,
  elapsedSec: number,
  label: string,
  image: HTMLImageElement | null,
) {
  if (!config.enabled) return;

  const opacity = Math.min(100, Math.max(0, config.opacity)) / 100;
  const px = fontPx(config.size, height);
  const continuous = config.movement === "continuous-diagonal";
  const path = continuous ? getContinuousDiagonalPosition(elapsedSec) : null;
  const driftY = continuous ? 0 : getWatermarkDriftY(config.movement, elapsedSec);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.font = `600 ${px}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const drawMark = (x: number, y: number, rot = 0) => {
    ctx.save();
    ctx.translate(x, y + driftY);
    if (rot) ctx.rotate(rot);
    if (image) {
      const ih =
        config.size === "small" ? px * 1.4 : config.size === "large" ? px * 2.2 : px * 1.8;
      const iw = (image.naturalWidth / Math.max(1, image.naturalHeight)) * ih;
      ctx.drawImage(image, -iw / 2, -ih / 2, iw, ih);
    } else {
      ctx.strokeText(label, 0, 0);
      ctx.fillText(label, 0, 0);
    }
    ctx.restore();
  };

  if (continuous && path) {
    // Single traveling mark — same path baked into every encoded frame
    const rot = config.style === "diagonal" ? -0.48 : 0;
    drawMark(path.x * width, path.y * height, rot);
  } else if (config.style === "diagonal") {
    const gapX = width * 0.42;
    const gapY = height * 0.22;
    for (let row = -1; row < 5; row++) {
      for (let col = -1; col < 4; col++) {
        drawMark(col * gapX + width * 0.15, row * gapY + height * 0.1, -0.48);
      }
    }
  } else if (config.style === "center") {
    drawMark(width / 2, height / 2, 0);
  } else {
    // corner / custom
    const margin = Math.max(16, width * 0.04);
    drawMark(width - margin - px * 2, height - margin - px, 0);
  }

  ctx.restore();
}

function waitForEvent(
  target: EventTarget,
  event: string,
  timeoutMs = 20000,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(
      () => reject(new Error(`Timeout waiting for ${event}`)),
      timeoutMs,
    );
    const onOk = () => {
      window.clearTimeout(t);
      resolve();
    };
    target.addEventListener(event, onOk, { once: true });
  });
}

/**
 * Encode a customer preview from a master video Object URL / blob URL.
 */
export async function encodeCustomerPreview(options: {
  masterUrl: string;
  quality: PreviewQuality;
  watermark: WatermarkConfig;
  watermarkLabel?: string;
  onProgress?: (pct: number) => void;
}): Promise<PreviewEncodeResult> {
  const profile = PREVIEW_ENCODE_PROFILES[options.quality];
  const mimeType = pickRecorderMime();
  const label = options.watermarkLabel ?? "RHYTHM";

  const video = document.createElement("video");
  video.playsInline = true;
  video.muted = true;
  video.preload = "auto";
  // crossOrigin on blob:/data: can hang loadedmetadata indefinitely in some browsers
  const local =
    options.masterUrl.startsWith("blob:") ||
    options.masterUrl.startsWith("data:");
  if (!local) {
    video.crossOrigin = "anonymous";
  }
  video.src = options.masterUrl;

  await waitForEvent(video, "loadedmetadata", 25000);
  if (video.readyState < 2) {
    await waitForEvent(video, "loadeddata").catch(() => undefined);
  }

  const srcW = video.videoWidth || 1080;
  const srcH = video.videoHeight || 1920;
  const durationSeconds = Number.isFinite(video.duration) ? video.duration : 0;
  const { width, height } = fitContain(
    srcW,
    srcH,
    profile.maxWidth,
    profile.maxHeight,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D unavailable");

  const wmImage = options.watermark.enabled && options.watermark.imageUrl
    ? await loadImage(options.watermark.imageUrl)
    : null;

  // Prefer capturing audio from the element when supported (still muted playback).
  const canvasStream = canvas.captureStream(profile.fps);
  const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
  const captureFn = (
    video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    }
  ).captureStream?.bind(video) ||
    (
      video as HTMLVideoElement & {
        mozCaptureStream?: () => MediaStream;
      }
    ).mozCaptureStream?.bind(video);
  if (captureFn) {
    try {
      video.muted = false;
      const native = captureFn();
      for (const t of native.getAudioTracks()) tracks.push(t);
    } catch {
      video.muted = true;
    }
  }

  const stream = new MediaStream(tracks);
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: profile.videoBitsPerSecond,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error("MediaRecorder failed"));
  });

  // Draw loop while video plays
  let raf = 0;
  let drawing = true;
  const draw = () => {
    if (!drawing) return;
    ctx.drawImage(video, 0, 0, width, height);
    drawWatermark(
      ctx,
      width,
      height,
      options.watermark,
      video.currentTime || 0,
      label,
      wmImage,
    );
    if (durationSeconds > 0) {
      options.onProgress?.(
        Math.min(99, Math.round((video.currentTime / durationSeconds) * 100)),
      );
    }
    raf = requestAnimationFrame(draw);
  };

  recorder.start(250);
  draw();

  try {
    await video.play();
  } catch {
    // Autoplay policies — try muted
    video.muted = true;
    await video.play();
  }

  await new Promise<void>((resolve) => {
    const onEnded = () => resolve();
    video.addEventListener("ended", onEnded, { once: true });
    // Safety timeout: duration + buffer
    const ms = Math.max(3000, (durationSeconds || 15) * 1000 + 2000);
    window.setTimeout(() => resolve(), ms);
  });

  drawing = false;
  cancelAnimationFrame(raf);
  // Final frame
  try {
    ctx.drawImage(video, 0, 0, width, height);
    drawWatermark(
      ctx,
      width,
      height,
      options.watermark,
      video.currentTime || durationSeconds,
      label,
      wmImage,
    );
  } catch {
    /* ignore */
  }

  if (recorder.state !== "inactive") recorder.stop();
  await stopped;

  video.pause();
  video.removeAttribute("src");
  video.load();
  for (const t of stream.getTracks()) t.stop();

  const blob = new Blob(chunks, { type: mimeType.split(";")[0] || "video/webm" });
  if (blob.size < 1000) {
    throw new Error("Encoded preview was empty — browser may not support recording");
  }

  options.onProgress?.(100);

  return {
    blob,
    mimeType: blob.type || "video/webm",
    width,
    height,
    resolution: `${width}x${height}`,
    sizeBytes: blob.size,
    durationSeconds,
    quality: options.quality,
    watermarkApplied: Boolean(options.watermark.enabled),
  };
}


export type ImagePreviewEncodeResult = {
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  resolution: string;
  sizeBytes: number;
  quality: PreviewQuality;
  watermarkApplied: boolean;
};

const IMAGE_PREVIEW_MAX: Record<PreviewQuality, number> = {
  standard: 720,
  optimized: 1080,
  high: 1440,
};

/**
 * Encode a watermarked customer preview still from a master image URL.
 * Master is never mutated. Watermark is baked into the output pixels.
 */
export async function encodeCustomerPreviewImage(options: {
  masterUrl: string;
  quality: PreviewQuality;
  watermark: WatermarkConfig;
  watermarkLabel?: string;
}): Promise<ImagePreviewEncodeResult> {
  const maxEdge = IMAGE_PREVIEW_MAX[options.quality] ?? 1080;
  const label = options.watermarkLabel ?? "RHYTHM";
  const wmImage =
    options.watermark.enabled && options.watermark.imageUrl
      ? await loadImage(options.watermark.imageUrl)
      : null;

  if (
    typeof window !== "undefined" &&
    window.sessionStorage?.getItem("rhythm:force-preview-fail") === "1"
  ) {
    window.sessionStorage.removeItem("rhythm:force-preview-fail");
    throw new Error(
      "Forced preview failure — use Retry preview generation to recover.",
    );
  }

  const master = await loadImage(options.masterUrl);
  if (!master) {
    throw new Error(
      "Could not load master image for preview encode. The file may be missing, unsupported, or blocked.",
    );
  }

  const srcW = master.naturalWidth || master.width;
  const srcH = master.naturalHeight || master.height;
  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");

  ctx.drawImage(master, 0, 0, width, height);
  drawWatermark(ctx, width, height, options.watermark, 0, label, wmImage);

  const mimeType = "image/jpeg";
  const quality =
    options.quality === "high" ? 0.86 : options.quality === "standard" ? 0.72 : 0.8;

  const blob = await new Promise<Blob>((resolve, reject) => {
    const timer = window.setTimeout(
      () => reject(new Error("Image preview encode timed out (canvas.toBlob)")),
      25000,
    );
    try {
      canvas.toBlob(
        (b) => {
          window.clearTimeout(timer);
          if (b) resolve(b);
          else reject(new Error("Image preview encode failed"));
        },
        mimeType,
        quality,
      );
    } catch (err) {
      window.clearTimeout(timer);
      reject(err instanceof Error ? err : new Error("Image preview encode failed"));
    }
  });

  return {
    blob,
    mimeType,
    width,
    height,
    resolution: `${width}x${height}`,
    sizeBytes: blob.size,
    quality: options.quality,
    watermarkApplied: Boolean(options.watermark.enabled),
  };
}
