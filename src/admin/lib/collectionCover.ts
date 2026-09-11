import type {
  AdminCollection,
  AdminProduct,
  CollectionCollageLayout,
  CollectionSortMode,
  MediaAsset,
} from "@/admin/types";
import {
  normalizeCollectionOffer,
  normalizeCollectionPricing,
} from "@/admin/lib/collectionPricing";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";

export function slotCountForLayout(layout: CollectionCollageLayout): number {
  switch (layout) {
    case "single":
      return 1;
    case "two-horizontal":
    case "two-vertical":
      return 2;
    case "three-horizontal":
    case "three-vertical":
    case "three-large-left":
    case "three-large-right":
      return 3;
    case "four-grid":
    case "four-horizontal":
    case "four-vertical":
      return 4;
    default:
      return 1;
  }
}

function productThumb(
  product: AdminProduct | undefined,
  mediaAssets?: MediaAsset[],
): string | undefined {
  const url = resolveProductThumbnail(product, mediaAssets);
  return url || undefined;
}

function productsInCollection(
  collection: AdminCollection,
  products: AdminProduct[],
): AdminProduct[] {
  const map = new Map(products.map((p) => [p.id, p]));
  return collection.productIds
    .map((id) => map.get(id))
    .filter((p): p is AdminProduct => !!p);
}

function pickAutoCover(
  collection: AdminCollection,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string | undefined {
  const list = productsInCollection(collection, products);
  if (!list.length) return undefined;

  const source = collection.coverAutoSource ?? "first";
  if (source === "first") return productThumb(list[0], mediaAssets);
  if (source === "popular") {
    const sorted = [...list].sort(
      (a, b) =>
        (b.performance?.playsNumeric ?? b.sales ?? 0) -
        (a.performance?.playsNumeric ?? a.sales ?? 0),
    );
    return productThumb(sorted[0], mediaAssets);
  }
  let hash = 0;
  for (const ch of collection.id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return productThumb(list[hash % list.length], mediaAssets);
}

export function resolveCollectionCoverUrl(
  collection: AdminCollection,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string {
  const fallback =
    collection.coverImage ||
    collection.coverCustomUrl ||
    "/media/collections/viral-moves-vol-01.jpg";

  switch (collection.coverMode) {
    case "custom":
      return collection.coverCustomUrl || collection.coverImage || fallback;
    case "single": {
      if (collection.coverProductId) {
        const p = products.find((x) => x.id === collection.coverProductId);
        const thumb = productThumb(p, mediaAssets);
        if (thumb) return thumb;
      }
      if (collection.coverMediaId && mediaAssets) {
        const asset = mediaAssets.find((a) => a.id === collection.coverMediaId);
        const thumb = asset?.thumbnail.url;
        if (thumb) return thumb;
      }
      return pickAutoCover(collection, products, mediaAssets) || fallback;
    }
    case "collage": {
      const slots = collection.coverSlots ?? [];
      const filled = [...slots]
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .find((s) => s.productId);
      if (filled?.productId) {
        const p = products.find((x) => x.id === filled.productId);
        const thumb = productThumb(p, mediaAssets);
        if (thumb) return thumb;
      }
      return pickAutoCover(collection, products, mediaAssets) || fallback;
    }
    case "auto":
    default:
      return pickAutoCover(collection, products, mediaAssets) || fallback;
  }
}

export function normalizeCollection(
  c: Partial<AdminCollection> &
    Pick<AdminCollection, "id" | "name" | "slug" | "description" | "productIds" | "status" | "featured" | "createdAt" | "updatedAt"> & {
      coverImage?: string;
    },
): AdminCollection {
  const coverImage = c.coverImage || "/media/collections/viral-moves-vol-01.jpg";
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    coverImage,
    coverMode: c.coverMode ?? "custom",
    coverMediaId: c.coverMediaId,
    coverAutoSource: c.coverAutoSource ?? "first",
    coverProductId: c.coverProductId,
    coverLayout: c.coverLayout,
    coverSlots: c.coverSlots ?? [],
    coverCustomUrl:
      c.coverCustomUrl ??
      ((c.coverMode ?? "custom") === "custom" ? coverImage : undefined),
    productIds: c.productIds ?? [],
    characterRules: c.characterRules ?? [],
    sortMode: c.sortMode ?? "custom",
    pricing: normalizeCollectionPricing(c.pricing),
    offer: normalizeCollectionOffer(c.offer),
    status: c.status,
    featured: c.featured,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function applyCharacterRules(
  collection: AdminCollection,
  products: AdminProduct[],
): string[] {
  const rules = collection.characterRules ?? [];
  if (!rules.length) return [...collection.productIds];

  const ids = new Set(collection.productIds);
  for (const rule of rules) {
    if (!rule.includeExistingProducts && !rule.automaticallyIncludeFutureProducts) {
      continue;
    }
    // Both flags mean include matching products currently in catalog
    if (rule.includeExistingProducts || rule.automaticallyIncludeFutureProducts) {
      for (const p of products) {
        if (p.characterId === rule.characterId) ids.add(p.id);
      }
    }
  }
  // Preserve original order, then append newly added ids
  const ordered = [...collection.productIds];
  for (const id of ids) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function sortCollectionProducts(
  productIds: string[],
  products: AdminProduct[],
  sortMode: CollectionSortMode,
): string[] {
  if (sortMode === "custom") return [...productIds];

  const map = new Map(products.map((p) => [p.id, p]));
  const list = productIds
    .map((id) => map.get(id))
    .filter((p): p is AdminProduct => !!p);

  const sorted = [...list];
  switch (sortMode) {
    case "newest":
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      break;
    case "popular":
      sorted.sort(
        (a, b) =>
          (b.performance?.playsNumeric ?? b.sales ?? 0) -
          (a.performance?.playsNumeric ?? a.sales ?? 0),
      );
      break;
    case "engagement":
      sorted.sort(
        (a, b) =>
          (b.performance?.engagementPct ?? 0) -
          (a.performance?.engagementPct ?? 0),
      );
      break;
    case "price-asc":
      sorted.sort(
        (a, b) =>
          (a.pricing?.INR?.currentPrice ?? 0) -
          (b.pricing?.INR?.currentPrice ?? 0),
      );
      break;
    case "price-desc":
      sorted.sort(
        (a, b) =>
          (b.pricing?.INR?.currentPrice ?? 0) -
          (a.pricing?.INR?.currentPrice ?? 0),
      );
      break;
  }

  const sortedIds = sorted.map((p) => p.id);
  // Keep any unknown ids at the end
  for (const id of productIds) {
    if (!sortedIds.includes(id)) sortedIds.push(id);
  }
  return sortedIds;
}
