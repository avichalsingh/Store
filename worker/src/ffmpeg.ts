import { spawn, type ChildProcess } from "node:child_process";
import { CUSTOMER_PREVIEW_MAX_SECONDS } from "./supabase.js";
import {
  DEFAULT_WORKER_WATERMARK,
  buildDiagonalTextFilterComplex,
  buildLogoFilterComplex,
  buildTextWatermarkFilters,
  needsDiagonalTextRotatePath,
  type WorkerWatermarkConfig,
} from "./watermark.js";

/**
 * Customer preview profile (Phase 5A):
 * - MP4 / H.264 / Safari-compatible (+faststart)
 * - max 8 seconds
 * - ~540×960 (preserve aspect, even dims)
 * - ~24 fps
 * - ~0.85 Mbps video
 * - AAC audio when the master has an audio stream (no `-an`)
 * - baked-in watermark from Admin Media & Watermark settings (text or logo)
 */

export type FfmpegPaths = {
  masterFile: string;
  previewFile: string;
  thumbFile: string;
};

/** Default 8 minutes; override with WORKER_FFMPEG_TIMEOUT_MS. */
const DEFAULT_FFMPEG_TIMEOUT_MS = 8 * 60 * 1000;
const STDERR_CAP_BYTES = 16 * 1024;
const KILL_GRACE_MS = 2000;

function getFfmpegTimeoutMs(): number {
  const raw = process.env.WORKER_FFMPEG_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_FFMPEG_TIMEOUT_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 30_000) return DEFAULT_FFMPEG_TIMEOUT_MS;
  return Math.floor(n);
}

function appendStderrTail(current: string, chunk: Buffer | string): string {
  const next = current + chunk.toString();
  if (next.length <= STDERR_CAP_BYTES) return next;
  return next.slice(next.length - STDERR_CAP_BYTES);
}

function forceKillChild(child: ChildProcess): void {
  if (child.killed || child.exitCode !== null) return;
  try {
    child.kill("SIGKILL");
  } catch {
    // Ignore — process may already be gone.
  }
}

function runFfmpeg(args: string[]): Promise<void> {
  const timeoutMs = getFfmpegTimeoutMs();

  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", ["-y", ...args], {
      stdio: ["ignore", "ignore", "pipe"],
    });

    let stderr = "";
    let settled = false;
    let timedOut = false;
    let killTimer: ReturnType<typeof setTimeout> | null = null;

    const finishOk = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
      resolve();
    };

    const finishErr = (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutTimer);
      if (!timedOut && killTimer) clearTimeout(killTimer);
      reject(err);
    };

    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore.
      }
      killTimer = setTimeout(() => {
        forceKillChild(child);
      }, KILL_GRACE_MS);
      finishErr(
        new Error(
          `ffmpeg timed out after ${timeoutMs}ms` +
            (stderr.trim() ? `: ${stderr.trim()}` : ""),
        ),
      );
    }, timeoutMs);

    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr = appendStderrTail(stderr, chunk);
    });

    child.on("error", (err) => {
      forceKillChild(child);
      finishErr(
        new Error(
          `ffmpeg failed to start (is ffmpeg installed?): ${err.message}`,
        ),
      );
    });

    child.on("close", (code, signal) => {
      if (killTimer) clearTimeout(killTimer);
      if (timedOut) {
        forceKillChild(child);
        return;
      }
      if (code === 0) {
        finishOk();
        return;
      }
      const tail = stderr.trim();
      finishErr(
        new Error(
          `ffmpeg exited ${code ?? "null"}${signal ? ` signal=${signal}` : ""}: ${tail || "no stderr"}`,
        ),
      );
    });
  });
}

/**
 * Scale to fit within 540×960, even dimensions —
 * force_original_aspect_ratio=decrease keeps aspect.
 */
const SCALE_FILTER =
  "scale='min(540,iw)':'min(960,ih)':force_original_aspect_ratio=decrease," +
  "scale=trunc(iw/2)*2:trunc(ih/2)*2";

const ENCODE_ARGS = [
  "-r",
  "24",
  "-c:v",
  "libx264",
  "-profile:v",
  "main",
  "-level",
  "4.0",
  "-pix_fmt",
  "yuv420p",
  "-b:v",
  "850k",
  "-maxrate",
  "900k",
  "-bufsize",
  "1700k",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-ac",
  "2",
  "-ar",
  "44100",
  "-movflags",
  "+faststart",
] as const;

function buildVideoFilter(watermark: WorkerWatermarkConfig): string {
  const wm = buildTextWatermarkFilters(watermark);
  return wm ? `${SCALE_FILTER},${wm}` : SCALE_FILTER;
}

async function encodeTextOrPlain(
  paths: FfmpegPaths,
  watermark: WorkerWatermarkConfig,
): Promise<void> {
  const vf = buildVideoFilter(watermark);
  // Default stream selection (no explicit -map): video + audio when present.
  // Do not use -an — that stripped customer audio. AAC is widely playable.
  // Masters without audio still encode successfully (video-only output).
  await runFfmpeg([
    "-i",
    paths.masterFile,
    "-t",
    String(CUSTOMER_PREVIEW_MAX_SECONDS),
    "-vf",
    vf,
    ...ENCODE_ARGS,
    paths.previewFile,
  ]);
}

/**
 * Diagonal text: upright sparse grid on transparent canvas → rotate → overlay.
 * Uses filter_complex + optional audio map (same contract as logo encode).
 */
async function encodeDiagonalText(
  paths: FfmpegPaths,
  watermark: WorkerWatermarkConfig,
): Promise<void> {
  const filterComplex = buildDiagonalTextFilterComplex(watermark);
  await runFfmpeg([
    "-i",
    paths.masterFile,
    "-t",
    String(CUSTOMER_PREVIEW_MAX_SECONDS),
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-map",
    "0:a?",
    ...ENCODE_ARGS,
    paths.previewFile,
  ]);
}

async function encodeWithLogo(
  paths: FfmpegPaths,
  watermark: WorkerWatermarkConfig,
  logoFile: string,
): Promise<void> {
  const filterComplex = buildLogoFilterComplex(watermark);
  // Explicit maps: filtered video + optional master audio (silent masters OK).
  // Never use -an.
  await runFfmpeg([
    "-i",
    paths.masterFile,
    "-i",
    logoFile,
    "-t",
    String(CUSTOMER_PREVIEW_MAX_SECONDS),
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-map",
    "0:a?",
    ...ENCODE_ARGS,
    paths.previewFile,
  ]);
}

export async function generateCustomerPreview(
  paths: FfmpegPaths,
  watermark: WorkerWatermarkConfig = DEFAULT_WORKER_WATERMARK,
  logoFile?: string | null,
): Promise<{ resolution: string }> {
  if (watermark.enabled && watermark.logoPath) {
    if (!logoFile) {
      throw new Error(
        "Watermark logo is configured but was not available for encoding",
      );
    }
    await encodeWithLogo(paths, watermark, logoFile);
  } else if (needsDiagonalTextRotatePath(watermark)) {
    await encodeDiagonalText(paths, watermark);
  } else {
    await encodeTextOrPlain(paths, watermark);
  }
  return { resolution: "<=540x960" };
}

/** Clean JPEG poster from master — no watermark, no private URL exposure. */
export async function generateThumbnail(paths: FfmpegPaths): Promise<void> {
  await runFfmpeg([
    "-i",
    paths.masterFile,
    "-ss",
    "1",
    "-frames:v",
    "1",
    "-q:v",
    "3",
    paths.thumbFile,
  ]);
}
