import { spawn, type ChildProcess } from "node:child_process";
import { CUSTOMER_PREVIEW_MAX_SECONDS } from "./supabase.js";

/**
 * Customer preview profile (Phase 5A):
 * - MP4 / H.264 / Safari-compatible (+faststart)
 * - max 8 seconds
 * - ~540×960 (preserve aspect, even dims)
 * - ~24 fps
 * - ~0.85 Mbps video
 * - baked-in RHYTHM watermark
 * - no audio (storefront silent loop)
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
      // On timeout, keep killTimer so SIGKILL still fires.
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

function watermarkFilter(): string {
  const font = process.env.WORKER_WATERMARK_FONT?.trim();
  const fontClause = font ? `fontfile=${font}:` : "";
  return (
    `drawtext=${fontClause}text='RHYTHM':fontsize=h*0.045:fontcolor=white@0.38:` +
    "x=(w-text_w)/2:y=(h-text_h)/2:" +
    "box=1:boxcolor=black@0.15:boxborderw=8"
  );
}

export async function generateCustomerPreview(
  paths: FfmpegPaths,
): Promise<{ resolution: string }> {
  const vf = `${SCALE_FILTER},${watermarkFilter()}`;
  await runFfmpeg([
    "-i",
    paths.masterFile,
    "-t",
    String(CUSTOMER_PREVIEW_MAX_SECONDS),
    "-vf",
    vf,
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
    "-an",
    "-movflags",
    "+faststart",
    paths.previewFile,
  ]);
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
