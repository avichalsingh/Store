/**
 * Harden public catalog media URLs — block private masters while preserving
 * intentional storefront assets (media-previews HTTPS + root-relative public paths).
 */

import {
  isPrivateMasterStorageRef,
  isPublicCustomerMediaUrl,
  isSeedPlaceholderVideo,
} from "@/admin/lib/mediaPreview";

/**
 * URLs safe to expose on the public catalog / PDP.
 * - HTTPS objects under media-previews
 * - Root-relative site assets (e.g. /media/…) that are not master Storage refs
 * Never media-masters paths or seed “fake .mp4” placeholders.
 */
export function isAllowedStorefrontMediaUrl(
  url: string | null | undefined,
): boolean {
  if (!url?.trim()) return false;
  const raw = url.trim();
  if (isPrivateMasterStorageRef(raw)) return false;
  if (isSeedPlaceholderVideo(raw)) return false;
  // Never expose signed/authenticated Storage object URLs on the public catalog.
  if (
    /\/storage\/v1\/object\/(?:sign|authenticated)\//i.test(raw) ||
    /[?&]token=/i.test(raw)
  ) {
    return false;
  }
  if (isPublicCustomerMediaUrl(raw)) return true;
  // Root-relative public site assets (demo/seed images, static files).
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  // Other https images/videos that are not private Storage masters.
  if (/^https:\/\//i.test(raw) && !raw.includes("media-masters/")) {
    return true;
  }
  return false;
}

/** Keep only storefront-safe URLs (or empty). */
export function sanitizePublicMediaUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url?.trim()) return undefined;
  return isAllowedStorefrontMediaUrl(url) ? url.trim() : undefined;
}

/**
 * Strip non-public preview/thumbnail fields from a catalog product-shaped
 * media object before it leaves the server.
 */
export function sanitizeCatalogMediaJson(media: unknown): {
  thumbnail?: string;
  previewVideo?: string;
} {
  if (!media || typeof media !== "object") return {};
  const o = media as Record<string, unknown>;
  const thumbnail = sanitizePublicMediaUrl(
    typeof o.thumbnail === "string" ? o.thumbnail : undefined,
  );
  const previewVideo = sanitizePublicMediaUrl(
    typeof o.previewVideo === "string" ? o.previewVideo : undefined,
  );
  return {
    ...(thumbnail ? { thumbnail } : {}),
    ...(previewVideo ? { previewVideo } : {}),
  };
}
