/**
 * Helpers for aligning Homepage CMS picks with the live storefront catalog.
 * Admin localStorage/seed IDs that are not in /api/catalog cannot render on
 * the public homepage (Hero falls back to automatic picks).
 */

import {
  PRODUCT_TYPES,
  type ProductType,
} from "@/catalog/productTypes";

export type StorefrontCatalogIdSet = ReadonlySet<string>;

/** Minimal product shape for Homepage CMS browse (from /api/catalog). */
export type StorefrontCatalogPickProduct = {
  id: string;
  name: string;
  productType: ProductType;
  thumbnail: string;
};

const PRODUCT_TYPE_SET = new Set<string>(PRODUCT_TYPES);

function asProductType(value: unknown): ProductType | null {
  if (typeof value !== "string") return null;
  return PRODUCT_TYPE_SET.has(value) ? (value as ProductType) : null;
}

/** Build an id set from a public catalog product list. */
export function storefrontProductIdSet(
  products: Array<{ id?: string | null }> | null | undefined,
): StorefrontCatalogIdSet {
  const next = new Set<string>();
  for (const product of products ?? []) {
    const id = typeof product?.id === "string" ? product.id.trim() : "";
    if (id) next.add(id);
  }
  return next;
}

export function isStorefrontCatalogProductId(
  id: string | null | undefined,
  catalogIds: StorefrontCatalogIdSet,
): boolean {
  if (!id || !id.trim()) return false;
  return catalogIds.has(id.trim());
}

/**
 * Map /api/catalog products into Homepage picker rows.
 * Prefer these over AdminProvider seed products — seed-only IDs never render.
 */
export function mapStorefrontCatalogPickProducts(
  products: Array<Record<string, unknown>> | null | undefined,
): StorefrontCatalogPickProduct[] {
  const out: StorefrontCatalogPickProduct[] = [];
  for (const product of products ?? []) {
    const id = typeof product.id === "string" ? product.id.trim() : "";
    if (!id) continue;
    const productType = asProductType(product.productType);
    if (!productType) continue;
    const title =
      typeof product.title === "string"
        ? product.title.trim()
        : typeof product.name === "string"
          ? product.name.trim()
          : "";
    const thumbnail =
      typeof product.thumbnail === "string" ? product.thumbnail : "";
    out.push({
      id,
      name: title || id,
      productType,
      thumbnail,
    });
  }
  return out;
}

/**
 * Filter admin products to those present in the live storefront catalog.
 * When the catalog has not loaded yet, return [] (fail closed for picking).
 */
export function filterAdminProductsInStorefrontCatalog<
  T extends { id: string },
>(
  adminProducts: T[],
  catalogIds: StorefrontCatalogIdSet | null,
): T[] {
  if (!catalogIds) return [];
  return adminProducts.filter((p) => catalogIds.has(p.id));
}
