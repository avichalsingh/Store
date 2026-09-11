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
