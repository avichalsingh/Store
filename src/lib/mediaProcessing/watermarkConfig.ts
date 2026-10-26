/**
 * Server-side watermark contract for the FFmpeg worker.
 * Mirrors Admin WatermarkConfig enums; sanitized before worker dispatch.
 * Never import service-role or private master URLs here.
 */

import { isAllowedWatermarkLogoPath } from "./watermarkLogo";

export type WorkerWatermarkStyle =
  | "diagonal"
  | "center"
  | "corner"
  | "custom";

export type WorkerWatermarkSize = "small" | "medium" | "large";

export type WorkerWatermarkMovement =
  | "static"
  | "subtle"
  | "dynamic"
  | "continuous-diagonal";

/**
 * Serializable watermark sent Admin → process API → worker.
 * Logo is referenced by allowlisted Storage path only (never a remote URL).
 */
export type WorkerWatermarkConfig = {
  enabled: boolean;
  style: WorkerWatermarkStyle;
  opacity: number;
  size: WorkerWatermarkSize;
  movement: WorkerWatermarkMovement;
  /** Display text when no logo is configured; default RHYTHM. */
  text?: string;
  /**
   * Allowlisted path in the watermark-logo bucket (e.g. system/watermark-logo.png).
   * When set, the worker bakes the logo instead of text.
   */
  logoPath?: string;
};

/** Matches seedMediaSettings — used only when the client omits watermark entirely. */
export const DEFAULT_WORKER_WATERMARK: WorkerWatermarkConfig = {
  enabled: true,
  style: "diagonal",
  opacity: 45,
  size: "large",
  movement: "subtle",
  text: "RHYTHM",
};

const STYLES = new Set<WorkerWatermarkStyle>([
  "diagonal",
  "center",
  "corner",
  "custom",
]);
const SIZES = new Set<WorkerWatermarkSize>(["small", "medium", "large"]);
const MOVEMENTS = new Set<WorkerWatermarkMovement>([
  "static",
  "subtle",
  "dynamic",
  "continuous-diagonal",
]);

export type SanitizeWatermarkResult =
  | { ok: true; watermark: WorkerWatermarkConfig }
  | { ok: false; error: string };

/**
 * Clamp / whitelist client watermark payload for the worker.
 * Rejects non-allowlisted logo paths (SSRF / path traversal guard).
 */
export function sanitizeWorkerWatermark(
  input: unknown,
): SanitizeWatermarkResult {
  if (!input || typeof input !== "object") {
    return { ok: true, watermark: { ...DEFAULT_WORKER_WATERMARK } };
  }
  const o = input as Record<string, unknown>;
  const styleRaw = String(o.style ?? "");
  const sizeRaw = String(o.size ?? "");
  const movementRaw = String(o.movement ?? "");
  const opacityNum = Number(o.opacity);
  const textRaw =
    typeof o.text === "string" ? o.text.trim().slice(0, 32) : "";

  const logoRaw =
    typeof o.logoPath === "string"
      ? o.logoPath.trim()
      : typeof o.imageStoragePath === "string"
        ? o.imageStoragePath.trim()
        : "";

  if (logoRaw && !isAllowedWatermarkLogoPath(logoRaw)) {
    return {
      ok: false,
      error:
        "Invalid watermark logo path — only the trusted system logo object is allowed",
    };
  }

  return {
    ok: true,
    watermark: {
      enabled: o.enabled !== false,
      style: STYLES.has(styleRaw as WorkerWatermarkStyle)
        ? (styleRaw as WorkerWatermarkStyle)
        : DEFAULT_WORKER_WATERMARK.style,
      opacity: Number.isFinite(opacityNum)
        ? Math.min(100, Math.max(0, Math.round(opacityNum)))
        : DEFAULT_WORKER_WATERMARK.opacity,
      size: SIZES.has(sizeRaw as WorkerWatermarkSize)
        ? (sizeRaw as WorkerWatermarkSize)
        : DEFAULT_WORKER_WATERMARK.size,
      movement: MOVEMENTS.has(movementRaw as WorkerWatermarkMovement)
        ? (movementRaw as WorkerWatermarkMovement)
        : DEFAULT_WORKER_WATERMARK.movement,
      text: textRaw || DEFAULT_WORKER_WATERMARK.text,
      logoPath: logoRaw || undefined,
    },
  };
}
