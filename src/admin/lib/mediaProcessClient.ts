/**
 * Browser helper: enqueue server/worker preview jobs and poll status.
 * Never talks to the worker or service role directly.
 */

import type { WatermarkConfig } from "@/admin/types";
import { isAllowedWatermarkLogoPath } from "@/lib/mediaProcessing/watermarkLogo";

export type MediaProcessEnqueueResult =
  | {
      ok: true;
      status: "queued" | "processing" | "ready";
      previewUrl?: string;
      thumbnailUrl?: string;
      skipped?: boolean;
      message?: string;
    }
  | { ok: false; error: string };

export type MediaProcessStatusResult =
  | {
      ok: true;
      status: string;
      previewPlayback?: string;
      previewUrl?: string;
      thumbnailUrl?: string;
      error?: string;
    }
  | { ok: false; error: string };

const POLL_INITIAL_MS = 2500;
const POLL_MAX_MS = 5000;
const POLL_DEADLINE_MS = 15 * 60 * 1000;

export async function enqueueMediaProcess(options: {
  mediaAssetId: string;
  productId: string;
  force?: boolean;
  /** Effective watermark from Admin Media & Watermark (global or custom). */
  watermark?: WatermarkConfig;
}): Promise<MediaProcessEnqueueResult> {
  let res: Response;
  try {
    const wm = options.watermark;
    if (!wm) {
      return {
        ok: false,
        error:
          "Watermark settings are required — open Admin Settings → Media & Watermark and Save, then retry",
      };
    }

    const logoPath =
      typeof wm.imageStoragePath === "string" &&
      isAllowedWatermarkLogoPath(wm.imageStoragePath)
        ? wm.imageStoragePath.trim()
        : undefined;

    if (wm.imageUrl?.startsWith("blob:")) {
      return {
        ok: false,
        error:
          "Watermark logo is not saved yet — Save media settings to upload the logo, then regenerate",
      };
    }
    if (
      wm.imageUrl === "/api/admin/media/watermark-logo" &&
      !logoPath
    ) {
      return {
        ok: false,
        error:
          "Watermark logo path is missing — Save media settings to upload the logo, then regenerate",
      };
    }

    const watermark = {
      enabled: Boolean(wm.enabled),
      style: wm.style,
      opacity: wm.opacity,
      size: wm.size,
      movement: wm.movement,
      text: "RHYTHM",
      logoPath,
    };
    res = await fetch("/api/admin/media/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        mediaAssetId: options.mediaAssetId,
        productId: options.productId,
        force: Boolean(options.force),
        watermark,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: `Could not reach process API: ${message}` };
  }

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    status?: string;
    error?: string;
    message?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    skipped?: boolean;
  } | null;

  if (!data) {
    return { ok: false, error: `Preview enqueue failed (${res.status})` };
  }

  if (data.ok && data.status === "ready" && data.previewUrl && data.thumbnailUrl) {
    return {
      ok: true,
      status: "ready",
      previewUrl: data.previewUrl,
      thumbnailUrl: data.thumbnailUrl,
      skipped: data.skipped,
      message: data.message,
    };
  }

  if (data.ok && (res.status === 202 || data.status === "queued" || data.status === "processing")) {
    return {
      ok: true,
      status: data.status === "processing" ? "processing" : "queued",
      message: data.message,
    };
  }

  return {
    ok: false,
    error:
      data.error ||
      data.message ||
      `Preview enqueue failed (${res.status})`,
  };
}

export async function fetchMediaProcessStatus(
  mediaAssetId: string,
): Promise<MediaProcessStatusResult> {
  let res: Response;
  try {
    res = await fetch(
      `/api/admin/media/status?mediaAssetId=${encodeURIComponent(mediaAssetId)}`,
      { credentials: "same-origin", cache: "no-store" },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { ok: false, error: message };
  }

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    status?: string;
    previewPlayback?: string;
    previewUrl?: string;
    thumbnailUrl?: string;
    error?: string;
  } | null;

  if (!res.ok || !data?.ok) {
    return {
      ok: false,
      error: data?.error || `Status check failed (${res.status})`,
    };
  }

  return {
    ok: true,
    status: data.status || "uploaded",
    previewPlayback: data.previewPlayback,
    previewUrl: data.previewUrl,
    thumbnailUrl: data.thumbnailUrl,
    error: data.error,
  };
}

/**
 * Poll until ready/failed or deadline. Interval starts at 2.5s and caps at 5s.
 */
export async function waitForMediaProcessReady(options: {
  mediaAssetId: string;
  signal?: AbortSignal;
  onTick?: (status: string) => void;
}): Promise<
  | {
      ok: true;
      previewUrl: string;
      thumbnailUrl: string;
    }
  | { ok: false; error: string }
> {
  const started = Date.now();
  let delay = POLL_INITIAL_MS;

  while (Date.now() - started < POLL_DEADLINE_MS) {
    if (options.signal?.aborted) {
      return { ok: false, error: "Preview status watch cancelled" };
    }

    const status = await fetchMediaProcessStatus(options.mediaAssetId);
    if (!status.ok) {
      // Transient network blip — keep polling until deadline.
      options.onTick?.("processing");
    } else {
      options.onTick?.(status.status);
      if (
        status.status === "ready" &&
        status.previewUrl &&
        status.thumbnailUrl &&
        status.previewPlayback === "generated"
      ) {
        return {
          ok: true,
          previewUrl: status.previewUrl,
          thumbnailUrl: status.thumbnailUrl,
        };
      }
      if (status.status === "failed") {
        return {
          ok: false,
          error: status.error || "Preview processing failed",
        };
      }
    }

    await new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, delay);
      options.signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    });
    delay = Math.min(POLL_MAX_MS, Math.round(delay * 1.2));
  }

  return {
    ok: false,
    error: "Preview processing timed out — use Retry / Generate Preview",
  };
}
