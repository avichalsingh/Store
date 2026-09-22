/**
 * Map CMS AdminProduct → public.products / product_relationships row shapes.
 * Inverse of mapSupabaseProduct (which reads sanitized catalog_* views).
 */

import type { AdminProduct } from "@/admin/types";
import type { ProductRelationship } from "@/catalog/productPayloads";
import { isProductType } from "@/catalog/productTypes";

export type ProductsTableRow = {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  character_id: string | null;
  character_name: string | null;
  category: string;
  collection_ids: string[];
  short_description: string;
  description: string;
  tags: string[];
  status: "draft" | "active" | "archived";
  is_trending: boolean;
  is_featured: boolean;
  media_asset_id: string | null;
  media: AdminProduct["media"];
  thumbnail_mode: AdminProduct["thumbnailMode"] | null;
  watermark_mode: AdminProduct["watermarkMode"] | null;
  watermark_override: AdminProduct["watermarkOverride"] | null;
  preview_quality: AdminProduct["previewQuality"] | null;
  pricing: AdminProduct["pricing"];
  offer: AdminProduct["offer"];
  performance: AdminProduct["performance"];
  creator_activity: AdminProduct["creatorActivity"];
  campaign: AdminProduct["campaign"];
  availability: AdminProduct["availability"];
  duration: string;
  resolution: string;
  format: string;
  access: string;
  licenses: AdminProduct["licenses"];
  pdp_value_cards: AdminProduct["pdpValueCards"] | null;
  file_details: AdminProduct["fileDetails"] | null;
  sales: number;
  revenue_inr: number;
  prompt_data: AdminProduct["promptData"] | null;
  caption_pack_data: AdminProduct["captionPackData"] | null;
  ai_image_data: AdminProduct["aiImageData"] | null;
  bundle_data: AdminProduct["bundleData"] | null;
  created_at: string;
  updated_at: string;
};

export type ProductRelationshipRow = {
  id: string;
  product_id: string;
  related_product_id: string;
  relationship_type: string;
  sort_order: number;
  custom_price_inr: number | null;
  custom_price_usd: number | null;
};

const RELATIONSHIP_TYPES = new Set([
  "ADD_ON",
  "RELATED",
  "RECOMMENDED",
  "INCLUDED_IN_BUNDLE",
]);

export function validateAdminProductForPublish(
  product: unknown,
): { ok: true; product: AdminProduct } | { ok: false; error: string } {
  if (!product || typeof product !== "object") {
    return { ok: false, error: "Invalid product payload" };
  }
  const p = product as Partial<AdminProduct>;
  if (!p.id || typeof p.id !== "string") {
    return { ok: false, error: "Product id is required" };
  }
  if (!p.name || typeof p.name !== "string" || !p.name.trim()) {
    return { ok: false, error: "Product name is required" };
  }
  if (!p.slug || typeof p.slug !== "string" || !p.slug.trim()) {
    return { ok: false, error: "Product slug is required" };
  }
  if (!p.productType || !isProductType(p.productType)) {
    return { ok: false, error: "Invalid or missing product type" };
  }
  if (
    p.status !== "draft" &&
    p.status !== "active" &&
    p.status !== "archived"
  ) {
    return { ok: false, error: "Invalid product status" };
  }
  if (!p.pricing || typeof p.pricing !== "object") {
    return { ok: false, error: "Product pricing is required" };
  }
  return { ok: true, product: p as AdminProduct };
}

export function adminProductToProductsRow(
  product: AdminProduct,
): ProductsTableRow {
  const characterId =
    product.characterId && product.characterId.trim()
      ? product.characterId.trim()
      : null;

  const status =
    product.status === "draft" || product.status === "archived"
      ? product.status
      : "active";

  return {
    id: product.id,
    name: product.name.trim(),
    slug: product.slug.trim(),
    product_type: product.productType,
    character_id: characterId,
    character_name: product.characterName?.trim() || null,
    category: product.category ?? "",
    collection_ids: Array.isArray(product.collectionIds)
      ? product.collectionIds
      : [],
    short_description: product.shortDescription ?? "",
    description: product.description ?? "",
    tags: Array.isArray(product.tags) ? product.tags : [],
    status,
    is_trending: Boolean(product.isTrending),
    is_featured: Boolean(product.isFeatured),
    media_asset_id: product.mediaAssetId ?? null,
    media: product.media ?? { thumbnail: "" },
    thumbnail_mode: product.thumbnailMode ?? null,
    watermark_mode: product.watermarkMode ?? null,
    watermark_override: product.watermarkOverride ?? null,
    preview_quality: product.previewQuality ?? null,
    pricing: product.pricing,
    offer: product.offer ?? { enabled: false, label: "" },
    performance: product.performance ?? {},
    creator_activity: product.creatorActivity ?? {},
    campaign: product.campaign ?? {},
    availability: product.availability ?? { mode: "unlimited" },
    duration: product.duration ?? "",
    resolution: product.resolution ?? "",
    format: product.format ?? "",
    access: product.access ?? "",
    licenses: Array.isArray(product.licenses) ? product.licenses : [],
    pdp_value_cards: product.pdpValueCards ?? null,
    file_details: product.fileDetails ?? null,
    sales: typeof product.sales === "number" ? product.sales : 0,
    revenue_inr:
      typeof product.revenueInr === "number" ? product.revenueInr : 0,
    prompt_data: product.promptData ?? null,
    caption_pack_data: product.captionPackData ?? null,
    ai_image_data: product.aiImageData ?? null,
    bundle_data: product.bundleData ?? null,
    created_at: product.createdAt || new Date().toISOString(),
    updated_at: product.updatedAt || new Date().toISOString(),
  };
}

export function adminRelationshipsToRows(
  productId: string,
  relationships: ProductRelationship[] | undefined,
): ProductRelationshipRow[] {
  if (!Array.isArray(relationships)) return [];
  const rows: ProductRelationshipRow[] = [];
  for (const rel of relationships) {
    if (!rel?.id || !rel.relatedProductId) continue;
    if (!RELATIONSHIP_TYPES.has(rel.relationshipType)) continue;
    if (rel.relatedProductId === productId) continue;
    rows.push({
      id: rel.id,
      product_id: productId,
      related_product_id: rel.relatedProductId,
      relationship_type: rel.relationshipType,
      sort_order: typeof rel.sortOrder === "number" ? rel.sortOrder : 0,
      custom_price_inr:
        typeof rel.customPriceInr === "number" ? rel.customPriceInr : null,
      custom_price_usd:
        typeof rel.customPriceUsd === "number" ? rel.customPriceUsd : null,
    });
  }
  return rows;
}
