/**
 * Map verified DB entitlements + public catalog rows → storefront purchase cards.
 * Display-only; download/access still enforced via entitlements on the server.
 */

import type { PurchasedItem } from "@/types";

export type EntitlementRow = {
  id: string;
  product_id: string;
  created_at: string;
};

export type CatalogPurchaseDisplayRow = {
  id: string;
  name: string;
  character_name: string | null;
  product_type: string;
  media: { thumbnail?: string | null; previewVideo?: string | null } | null;
};

function purchasedTypeFromProductType(
  productType: string,
): PurchasedItem["type"] {
  if (productType === "VIDEO") return "video";
  if (productType === "COLLECTION") return "collection";
  return "product";
}

function purchasedAtDate(iso: string): string {
  const d = iso.trim();
  if (!d) return new Date().toISOString().slice(0, 10);
  return d.slice(0, 10);
}

export function mapEntitlementsToPurchases(
  entitlements: EntitlementRow[],
  catalogRows: CatalogPurchaseDisplayRow[],
): PurchasedItem[] {
  const byId = new Map(catalogRows.map((row) => [row.id, row]));
  const items: PurchasedItem[] = [];

  for (const ent of entitlements) {
    const product = byId.get(ent.product_id);
    // Catalog present → use its product_type (VIDEO/COLLECTION/…).
    // Orphan entitlement (no catalog row) → PurchasedItem.type "product" via
    // productType "PRODUCT". Never default missing catalog to VIDEO.
    const productType = product
      ? product.product_type.trim() || "PRODUCT"
      : "PRODUCT";
    const thumbnail =
      (typeof product?.media?.thumbnail === "string" &&
        product.media.thumbnail.trim()) ||
      "";
    items.push({
      id: ent.id,
      productId: ent.product_id,
      title: product?.name?.trim() || ent.product_id,
      characterName:
        product?.character_name?.trim() || productType.replace(/_/g, " "),
      thumbnail,
      purchasedAt: purchasedAtDate(ent.created_at),
      type: purchasedTypeFromProductType(productType),
      productType,
    });
  }

  return items;
}
