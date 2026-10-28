import type { StorefrontCatalog } from "@/catalog/mapAdminToStorefront";
import { collections, getCollectionById } from "@/data/collections";
import { getVideoById, videos } from "@/data/videos";
import {
  getCatalogProductQuote,
  getCollectionQuote,
  getVideoQuote,
} from "@/lib/pricing";
import type { CartItem, PriceQuote, Region } from "@/types";

export function getCartItemQuote(
  item: CartItem,
  region: Region,
  catalog?: StorefrontCatalog,
): PriceQuote {
  if (item.type === "video" || item.productType === "VIDEO") {
    const video =
      catalog?.getVideoById(item.productId) ?? getVideoById(item.productId);
    if (video) {
      const quote = getVideoQuote(video, region);
      if (item.customPriceInr != null && region === "india") {
        return { ...quote, current: item.customPriceInr, saleActive: false };
      }
      return quote;
    }
    // Fall through for legacy lines that may resolve as catalog products.
  }

  if (item.type === "collection") {
    const collection =
      catalog?.getCollectionById(item.productId) ??
      getCollectionById(item.productId);
    if (collection) return getCollectionQuote(collection, region);
  }

  if (item.type === "product" || item.type === "video") {
    const product = catalog?.getProductById(item.productId);
    if (product) {
      const quote = getCatalogProductQuote(product, region);
      if (item.customPriceInr != null && region === "india") {
        return { ...quote, current: item.customPriceInr, saleActive: false };
      }
      return quote;
    }
  }

  return {
    current: 0,
    regular: 0,
    saleActive: false,
    discountPct: 0,
  };
}

/**
 * Checkout INR unit quote — mirrors server create-order rules:
 * - Main lines: catalog/list INR price (never client customPriceInr).
 * - Add-on lines: parent's catalog addOnPriceOverrides.customPriceInr when > 0,
 *   else the add-on product's list INR price (same as product_relationships).
 */
export function getCheckoutInrQuote(
  item: CartItem,
  catalog?: StorefrontCatalog,
): PriceQuote {
  const region: Region = "india";
  const empty: PriceQuote = {
    current: 0,
    regular: 0,
    saleActive: false,
    discountPct: 0,
  };

  const listQuote = (): PriceQuote => {
    if (item.type === "video" || item.productType === "VIDEO") {
      const video =
        catalog?.getVideoById(item.productId) ?? getVideoById(item.productId);
      if (video) return getVideoQuote(video, region);
    }
    if (item.type === "collection") {
      const collection =
        catalog?.getCollectionById(item.productId) ??
        getCollectionById(item.productId);
      if (collection) return getCollectionQuote(collection, region);
    }
    if (item.type === "product" || item.type === "video") {
      const product = catalog?.getProductById(item.productId);
      if (product) return getCatalogProductQuote(product, region);
    }
    return empty;
  };

  const base = listQuote();
  if (!item.parentProductId) {
    return base;
  }

  const parent = catalog?.getProductById(item.parentProductId) as
    | { addOnPriceOverrides?: Record<string, { customPriceInr?: number }> }
    | undefined;
  const override =
    parent?.addOnPriceOverrides?.[item.productId]?.customPriceInr;
  if (typeof override === "number" && override > 0) {
    return {
      current: override,
      regular: override,
      saleActive: false,
      discountPct: 0,
    };
  }
  return base;
}

/** Quantity used for checkout totals (same rules as create-order client payload). */
export function getCheckoutLineQuantity(item: CartItem): number {
  return typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1
    ? item.quantity
    : 1;
}

/** Unit × quantity using the same quote as the checkout INR total. */
export function getCheckoutLineTotalInr(
  item: CartItem,
  catalog?: StorefrontCatalog,
): number {
  return getCheckoutInrQuote(item, catalog).current * getCheckoutLineQuantity(item);
}

export function sumCheckoutInr(
  items: CartItem[],
  catalog?: StorefrontCatalog,
): number {
  return items.reduce(
    (sum, item) => sum + getCheckoutLineTotalInr(item, catalog),
    0,
  );
}

export function sanitizeCartItems(
  items: CartItem[],
  catalog?: StorefrontCatalog,
): CartItem[] {
  const videoList = catalog?.videos ?? videos;
  const collectionList = catalog?.collections ?? collections;
  const productList = catalog?.products ?? [];

  const kept = items.filter((item) => {
    if (item.type === "video") {
      return videoList.some((video) => video.id === item.productId);
    }
    if (item.type === "collection") {
      return collectionList.some(
        (collection) => collection.id === item.productId,
      );
    }
    if (item.type === "product") {
      return productList.some((product) => product.id === item.productId);
    }
    return false;
  });

  const keptIds = new Set(kept.map((item) => item.productId));
  // Drop add-ons whose parent was removed from the cart.
  return kept.filter((item) => {
    if (!item.parentProductId) return true;
    return keptIds.has(item.parentProductId);
  });
}
