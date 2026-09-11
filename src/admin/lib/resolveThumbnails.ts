import type {
  AdminCollection,
  AdminProduct,
  MediaAsset,
} from "@/admin/types";
import {
  isImageUrl,
  resolveAdminMasterDisplayUrl,
} from "@/admin/lib/mediaPreview";

const FALLBACK_THUMB = "";
const COLLECTION_FALLBACK = "/media/collections/viral-moves-vol-01.jpg";

function isUsableThumb(url: string | undefined | null): url is string {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("data:image")) return true;
  return isImageUrl(url);
}

/** Admin media visual — clean Master / poster (never watermarked Preview). */
export function resolveMediaThumbnail(asset: MediaAsset | undefined | null): string {
  if (!asset) return FALLBACK_THUMB;
  const fromMaster = resolveAdminMasterDisplayUrl(asset);
  if (fromMaster) return fromMaster;
  return FALLBACK_THUMB;
}

/**
 * Admin product list / editor thumbnails — clean Master.
 * Storefront AI_IMAGE / VIDEO public visuals use mapAdminToStorefront +
 * resolvePublicPreviewUrl / previewVideo instead.
 */
export function resolveProductThumbnail(
  product: AdminProduct | undefined | null,
  mediaAssets?: MediaAsset[],
): string {
  if (!product) return FALLBACK_THUMB;

  const asset =
    product.mediaAssetId && mediaAssets
      ? mediaAssets.find((a) => a.id === product.mediaAssetId)
      : undefined;

  if (product.thumbnailMode === "custom") {
    if (
      isUsableThumb(product.media.thumbnail) &&
      product.media.thumbnail !== asset?.preview.url
    ) {
      return product.media.thumbnail;
    }
    if (
      asset &&
      asset.thumbnail.source === "custom" &&
      isUsableThumb(asset.thumbnail.url) &&
      asset.thumbnail.url !== asset.preview.url
    ) {
      return asset.thumbnail.url;
    }
  }

  if (asset) {
    const fromAsset = resolveMediaThumbnail(asset);
    if (fromAsset) return fromAsset;
  }

  if (
    isUsableThumb(product.media.thumbnail) &&
    product.media.thumbnail !== asset?.preview.url
  ) {
    return product.media.thumbnail;
  }

  return FALLBACK_THUMB;
}

/** Collection cover / thumbnail from cover mode + content. */
export function resolveCollectionThumbnail(
  collection: AdminCollection,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string {
  if (collection.coverMode === "custom") {
    const custom = collection.coverCustomUrl || collection.coverImage;
    if (custom) return custom;
  }

  if (collection.coverMode === "single" && collection.coverProductId) {
    const p = products.find((x) => x.id === collection.coverProductId);
    const thumb = resolveProductThumbnail(p, mediaAssets);
    if (thumb) return thumb;
  }

  if (collection.coverMode === "single" && collection.coverMediaId && mediaAssets) {
    const asset = mediaAssets.find((a) => a.id === collection.coverMediaId);
    const thumb = resolveMediaThumbnail(asset);
    if (thumb) return thumb;
  }

  if (collection.coverMode === "collage") {
    const slots = [...(collection.coverSlots ?? [])].sort(
      (a, b) => a.slotIndex - b.slotIndex,
    );
    for (const slot of slots) {
      if (!slot.productId) continue;
      const p = products.find((x) => x.id === slot.productId);
      const thumb = resolveProductThumbnail(p, mediaAssets);
      if (thumb) return thumb;
    }
  }

  const list = collection.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is AdminProduct => !!p);

  if (list.length) {
    const source = collection.coverAutoSource ?? "first";
    let pick = list[0];
    if (source === "popular") {
      pick = [...list].sort(
        (a, b) =>
          (b.performance?.playsNumeric ?? b.sales ?? 0) -
          (a.performance?.playsNumeric ?? a.sales ?? 0),
      )[0];
    } else if (source === "random") {
      let hash = 0;
      for (const ch of collection.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
      pick = list[hash % list.length];
    }
    const thumb = resolveProductThumbnail(pick, mediaAssets);
    if (thumb) return thumb;
  }

  const legacy = collection.coverImage || collection.coverCustomUrl;
  return legacy || COLLECTION_FALLBACK;
}

/** Slot thumbnails for collage layouts. */
export function resolveCollectionSlotThumbnails(
  collection: AdminCollection,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string[] {
  const slots = [...(collection.coverSlots ?? [])].sort(
    (a, b) => a.slotIndex - b.slotIndex,
  );
  if (slots.length) {
    return slots.map((slot) => {
      if (!slot.productId) return "";
      const p = products.find((x) => x.id === slot.productId);
      return resolveProductThumbnail(p, mediaAssets);
    });
  }
  return collection.productIds.slice(0, 4).map((id) => {
    const p = products.find((x) => x.id === id);
    return resolveProductThumbnail(p, mediaAssets);
  });
}
