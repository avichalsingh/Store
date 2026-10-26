/**
 * Trusted watermark-logo storage contract (Admin → Storage → worker).
 * Fixed path only — never accept client-supplied buckets or remote URLs.
 * Safe to import from Admin client helpers (path allowlist only — no secrets).
 */

/** Private masters bucket — worker downloads with service role. */
export const WATERMARK_LOGO_BUCKET = "media-masters";

/** Max logo upload size (PNG/WebP). */
export const WATERMARK_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const WATERMARK_LOGO_CONTENT_TYPES = new Set([
  "image/png",
  "image/webp",
]);

/** Allowlisted object keys only. */
const LOGO_PATH_RE = /^system\/watermark-logo\.(png|webp)$/;

export function isAllowedWatermarkLogoPath(path: string): boolean {
  return LOGO_PATH_RE.test(path.trim());
}

export function watermarkLogoPathForContentType(contentType: string): string {
  if (contentType.includes("webp")) return "system/watermark-logo.webp";
  return "system/watermark-logo.png";
}

/** Same-origin Admin display URL (session cookie required). */
export const WATERMARK_LOGO_ADMIN_DISPLAY_PATH =
  "/api/admin/media/watermark-logo";
