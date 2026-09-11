import type { AdminProduct, MediaAsset } from "@/admin/types";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import type {
  BundleAutoCoverSource,
  BundleCollageLayout,
  BundleCoverMode,
  BundleCoverSlot,
  BundleData,
} from "@/catalog/productPayloads";

const BUNDLE_COVER_FALLBACK = "";

export function bundleSlotCountForLayout(layout: BundleCollageLayout): number {
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

function includedProducts(
  bundle: BundleData,
  products: AdminProduct[],
): AdminProduct[] {
  const map = new Map(products.map((p) => [p.id, p]));
  return bundle.includedProductIds
    .map((id) => map.get(id))
    .filter((p): p is AdminProduct => Boolean(p));
}

function pickAutoCover(
  bundle: BundleData,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string | undefined {
  const list = includedProducts(bundle, products);
  if (!list.length) return undefined;

  const source: BundleAutoCoverSource = bundle.coverAutoSource ?? "first";
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
  for (const ch of bundle.includedProductIds.join("")) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return productThumb(list[hash % list.length], mediaAssets);
}

export function resolveBundleCoverUrl(
  product: AdminProduct,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
): string {
  const bundle = normalizeBundleCoverData(product.bundleData);
  const fallback =
    product.media?.thumbnail ||
    bundle.coverCustomUrl ||
    BUNDLE_COVER_FALLBACK;

  switch (bundle.coverMode) {
    case "custom":
      return bundle.coverCustomUrl || product.media?.thumbnail || fallback;
    case "single": {
      if (bundle.coverProductId) {
        const p = products.find((x) => x.id === bundle.coverProductId);
        const thumb = productThumb(p, mediaAssets);
        if (thumb) return thumb;
      }
      if (bundle.coverMediaId && mediaAssets) {
        const asset = mediaAssets.find((a) => a.id === bundle.coverMediaId);
        const thumb = asset?.thumbnail.url;
        if (thumb) return thumb;
      }
      return pickAutoCover(bundle, products, mediaAssets) || fallback;
    }
    case "collage": {
      const slots = bundle.coverSlots ?? [];
      const filled = [...slots]
        .sort((a, b) => a.slotIndex - b.slotIndex)
        .find((s) => s.productId);
      if (filled?.productId) {
        const p = products.find((x) => x.id === filled.productId);
        const thumb = productThumb(p, mediaAssets);
        if (thumb) return thumb;
      }
      return pickAutoCover(bundle, products, mediaAssets) || fallback;
    }
    case "auto":
    default:
      return pickAutoCover(bundle, products, mediaAssets) || fallback;
  }
}

export function normalizeBundleCoverData(
  data: BundleData | undefined,
): BundleData {
  const base = data ?? { includedProductIds: [] };
  return {
    ...base,
    includedProductIds: base.includedProductIds ?? [],
    coverMode: base.coverMode ?? "auto",
    coverAutoSource: base.coverAutoSource ?? "first",
    coverSlots: base.coverSlots ?? [],
  };
}

export function bundleCoverSummary(bundle: BundleData): string {
  switch (bundle.coverMode ?? "auto") {
    case "auto":
      return `Auto (${bundle.coverAutoSource ?? "first"})`;
    case "single":
      return "Single product";
    case "collage":
      return `Collage · ${bundle.coverLayout ?? "four-grid"}`;
    case "custom":
      return "Custom upload";
    default:
      return bundle.coverMode ?? "auto";
  }
}

export function applyBundleCoverToProduct(
  product: AdminProduct,
  products: AdminProduct[],
  mediaAssets?: MediaAsset[],
  bundlePatch?: Partial<BundleData>,
): AdminProduct {
  const bundleData = normalizeBundleCoverData({
    ...product.bundleData,
    ...bundlePatch,
    includedProductIds:
      bundlePatch?.includedProductIds ??
      product.bundleData?.includedProductIds ??
      [],
  });
  const coverUrl = resolveBundleCoverUrl(
    { ...product, bundleData },
    products,
    mediaAssets,
  );
  return {
    ...product,
    bundleData,
    media: {
      ...product.media,
      thumbnail: coverUrl || product.media.thumbnail,
    },
  };
}

export type { BundleCoverMode, BundleCoverSlot };
