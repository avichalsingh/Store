import type { AdminProduct, MediaAsset } from "@/admin/types";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import {
  isSeedPlaceholderVideo,
  isVideoUrl,
} from "@/admin/lib/mediaPreview";

export type ResolveProductMediaOptions = {
  /**
   * When true, allows original-fallback master URL (admin-only contexts).
   * Storefront must leave this false so the master is never exposed.
   */
  allowMasterFallback?: boolean;
};

export type ResolvedProductMedia = {
  product: AdminProduct;
  asset: MediaAsset | null;
  /** Customer-facing preview video (never the protected master by default) */
  previewVideo: string;
  /** Resolved card / hero thumbnail */
  thumbnail: string;
  previewReady: boolean;
  watermarkApplied: boolean;
  hasLocalBlob: boolean;
  previewStale: boolean;
  previewSizeLabel?: string;
  previewResolution?: string;
  previewQuality?: string;
};

function isUsableCustomerPreview(
  url: string | undefined | null,
  masterUrl?: string,
): url is string {
  if (!url || !isVideoUrl(url)) return false;
  if (masterUrl && url === masterUrl) return false;
  if (isSeedPlaceholderVideo(url)) return false;
  return true;
}

/**
 * Single resolver for product ↔ media used by Admin UI and storefront.
 *
 * Product → mediaAssetId → MediaAsset → preview + thumbnail
 */
export function resolveProductMedia(
  product: AdminProduct | undefined | null,
  mediaAssets: MediaAsset[] = [],
  options: ResolveProductMediaOptions = {},
): ResolvedProductMedia | null {
  if (!product) return null;

  const asset =
    (product.mediaAssetId
      ? mediaAssets.find((a) => a.id === product.mediaAssetId)
      : undefined) ?? null;

  const thumbnail = resolveProductThumbnail(product, mediaAssets);

  let previewVideo = "";
  if (asset) {
    // Prefer a successfully generated derivative only
    if (
      asset.previewPlayback === "generated" &&
      isUsableCustomerPreview(asset.preview.url, asset.master.url)
    ) {
      previewVideo = asset.preview.url;
    } else if (
      isUsableCustomerPreview(product.media.previewVideo, asset.master.url) &&
      // Product-level copy of a real blob / non-placeholder URL
      (product.media.previewVideo.startsWith("blob:") ||
        Boolean(asset.preview.sizeBytes))
    ) {
      previewVideo = product.media.previewVideo;
    } else if (
      options.allowMasterFallback &&
      asset.previewPlayback === "original-fallback" &&
      isVideoUrl(asset.master.url) &&
      !isSeedPlaceholderVideo(asset.master.url)
    ) {
      previewVideo = asset.master.url;
    }
  } else if (
    isUsableCustomerPreview(product.media.previewVideo) &&
    product.media.previewVideo.startsWith("blob:")
  ) {
    previewVideo = product.media.previewVideo;
  }

  return {
    product,
    asset,
    previewVideo,
    thumbnail,
    previewReady: Boolean(previewVideo),
    watermarkApplied: Boolean(
      previewVideo && asset?.preview.watermarkApplied,
    ),
    hasLocalBlob: Boolean(asset?.hasLocalBlob),
    previewStale: Boolean(asset?.previewStale),
    previewSizeLabel: asset?.preview.sizeLabel,
    previewResolution: asset?.preview.resolution,
    previewQuality: asset?.preview.quality ?? asset?.previewQuality,
  };
}
