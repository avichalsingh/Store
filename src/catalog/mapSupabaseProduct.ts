/**
 * Map public Supabase catalog views → AdminProduct-shaped rows → CatalogProduct.
 * Reads only sanitized catalog_* view payloads (never raw private products columns).
 */

import type { AdminProduct } from "@/admin/types";
import { isPublicCustomerMediaUrl } from "@/admin/lib/mediaPreview";
import type { ProductRelationship } from "@/catalog/productPayloads";
import { adminProductToCatalog } from "@/catalog/mapAdminToStorefront";
import { defaultImagePdpGlobalSettings } from "@/catalog/imagePdpTypes";
import { isProductType, type ProductRelationshipType } from "@/catalog/productTypes";
import type { CaptionPackProductPublic, CatalogProduct } from "@/types";

/** Public-safe media_assets fields for catalog enrichment (never masters). */
export type CatalogMediaPublicRow = {
  id: string;
  preview_url: string | null;
  thumbnail_url: string | null;
  preview_playback: string | null;
  /** Used only to cache-bust public URLs after in-place Storage overwrites. */
  updated_at?: string | null;
};

/**
 * Append ?v=<updated_at ms> so browsers do not keep a silent/stale preview
 * after the worker overwrites the same Storage path.
 */
function withMediaCacheBust(
  url: string,
  updatedAt?: string | null,
): string {
  const raw = url.trim();
  if (!raw || !updatedAt) return raw;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return raw;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.set("v", String(t));
    return parsed.toString();
  } catch {
    return raw;
  }
}

/** Row shape from `catalog_products` (PostgREST / snake_case). */
export type CatalogProductRow = {
  id: string;
  name: string;
  slug: string;
  product_type: string;
  character_id: string | null;
  character_name: string | null;
  category: string | null;
  collection_ids: string[] | null;
  short_description: string | null;
  description: string | null;
  tags: string[] | null;
  status: string;
  is_trending: boolean | null;
  is_featured: boolean | null;
  media_asset_id: string | null;
  media: AdminProduct["media"] | null;
  thumbnail_mode: AdminProduct["thumbnailMode"] | null;
  watermark_mode: AdminProduct["watermarkMode"] | null;
  preview_quality: AdminProduct["previewQuality"] | null;
  pricing: AdminProduct["pricing"] | null;
  offer: AdminProduct["offer"] | null;
  performance: AdminProduct["performance"] | null;
  creator_activity: AdminProduct["creatorActivity"] | null;
  campaign: AdminProduct["campaign"] | null;
  availability: AdminProduct["availability"] | null;
  duration: string | null;
  resolution: string | null;
  format: string | null;
  access: string | null;
  licenses: AdminProduct["licenses"] | null;
  pdp_value_cards: AdminProduct["pdpValueCards"] | null;
  file_details: AdminProduct["fileDetails"] | null;
  sales: number | null;
  prompt_data: AdminProduct["promptData"] | null;
  caption_pack_data: Record<string, unknown> | null;
  ai_image_data: AdminProduct["aiImageData"] | null;
  bundle_data: AdminProduct["bundleData"] | null;
  created_at: string;
  updated_at: string;
};

/** Row shape from `catalog_product_relationships`. */
export type CatalogRelationshipRow = {
  id: string;
  product_id: string;
  related_product_id: string;
  relationship_type: string;
  sort_order: number | null;
  custom_price_inr: number | null;
  custom_price_usd: number | null;
};

const RELATIONSHIP_TYPES = new Set<string>([
  "ADD_ON",
  "RELATED",
  "RECOMMENDED",
  "INCLUDED_IN_BUNDLE",
]);

function asIso(value: string | null | undefined): string {
  if (!value) return new Date().toISOString();
  return value;
}

function groupRelationships(
  rows: CatalogRelationshipRow[],
): Map<string, ProductRelationship[]> {
  const map = new Map<string, ProductRelationship[]>();
  for (const row of rows) {
    if (!RELATIONSHIP_TYPES.has(row.relationship_type)) continue;
    const list = map.get(row.product_id) ?? [];
    list.push({
      id: row.id,
      relatedProductId: row.related_product_id,
      relationshipType: row.relationship_type as ProductRelationshipType,
      sortOrder: row.sort_order ?? 0,
      customPriceInr: row.custom_price_inr ?? undefined,
      customPriceUsd: row.custom_price_usd ?? undefined,
    });
    map.set(row.product_id, list);
  }
  return map;
}

/**
 * Public caption view payload is `{ itemCount, styleLabels }` (no full items).
 * Preserve counts/labels for post-mapping patch; keep items empty for privacy.
 */
function normalizeCaptionPackData(
  raw: Record<string, unknown> | null,
): {
  captionPackData: AdminProduct["captionPackData"];
  publicMeta: { itemCount?: number; styleLabels?: string[] };
} {
  if (!raw) {
    return { captionPackData: { items: [] }, publicMeta: {} };
  }
  if (Array.isArray(raw.items)) {
    return {
      captionPackData: raw as AdminProduct["captionPackData"],
      publicMeta: {},
    };
  }
  const itemCount =
    typeof raw.itemCount === "number"
      ? raw.itemCount
      : typeof raw.item_count === "number"
        ? raw.item_count
        : 0;
  const styleLabels = Array.isArray(raw.styleLabels)
    ? (raw.styleLabels as string[])
    : Array.isArray(raw.style_labels)
      ? (raw.style_labels as string[])
      : [];
  return {
    captionPackData: { items: [] },
    publicMeta: { itemCount, styleLabels },
  };
}

export function catalogRowToAdminProduct(
  row: CatalogProductRow,
  relationships: ProductRelationship[] = [],
): AdminProduct | null {
  if (!isProductType(row.product_type)) return null;

  const { captionPackData, publicMeta } = normalizeCaptionPackData(
    row.caption_pack_data,
  );

  const product: AdminProduct & {
    _captionPublicMeta?: { itemCount?: number; styleLabels?: string[] };
  } = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    productType: row.product_type,
    characterId: row.character_id ?? undefined,
    characterName: row.character_name ?? undefined,
    category: row.category ?? "",
    collectionIds: row.collection_ids ?? [],
    shortDescription: row.short_description ?? "",
    description: row.description ?? "",
    tags: row.tags ?? [],
    status:
      row.status === "draft" || row.status === "archived"
        ? row.status
        : "active",
    isTrending: Boolean(row.is_trending),
    isFeatured: Boolean(row.is_featured),
    mediaAssetId: row.media_asset_id ?? undefined,
    media: row.media ?? { thumbnail: "" },
    thumbnailMode: row.thumbnail_mode ?? undefined,
    watermarkMode: row.watermark_mode ?? undefined,
    previewQuality: row.preview_quality ?? undefined,
    pricing: row.pricing ?? {
      INR: { regularPrice: 0, currentPrice: 0 },
      USD: { regularPrice: 0, currentPrice: 0 },
    },
    offer: row.offer ?? { enabled: false, label: "" },
    performance: row.performance ?? {
      mode: "demo",
      plays: "0",
      playsNumeric: 0,
      likes: "0",
      likesNumeric: 0,
      shares: "0",
      sharesNumeric: 0,
      engagementPct: 0,
      status: "normal",
      badge: "",
      insight: "",
    },
    creatorActivity: row.creator_activity ?? {
      mode: "demo",
      addedThisWeek: 0,
      saved: 0,
      last24h: 0,
      activityLevel: "normal",
      note: "",
    },
    campaign: row.campaign ?? {
      enabled: false,
      label: "",
      headline: "",
      supportingText: "",
      ctaText: "",
      microMessages: [],
    },
    availability: row.availability ?? { mode: "unlimited" },
    duration: row.duration ?? "",
    resolution: row.resolution ?? "",
    format: row.format ?? "",
    access: row.access ?? "",
    licenses: row.licenses ?? [],
    pdpValueCards: row.pdp_value_cards ?? undefined,
    fileDetails: row.file_details ?? undefined,
    sales: row.sales ?? 0,
    revenueInr: 0,
    relationships,
    promptData: row.prompt_data ?? undefined,
    captionPackData,
    aiImageData: row.ai_image_data ?? undefined,
    bundleData: row.bundle_data ?? undefined,
    createdAt: asIso(row.created_at),
    updatedAt: asIso(row.updated_at),
    _captionPublicMeta: publicMeta,
  };

  return product;
}

function patchCaptionPackPublic(
  catalog: CatalogProduct,
  meta: { itemCount?: number; styleLabels?: string[] } | undefined,
): CatalogProduct {
  if (catalog.productType !== "CAPTION_PACK" || !meta) return catalog;
  const next: CaptionPackProductPublic = {
    ...catalog,
    itemCount:
      typeof meta.itemCount === "number"
        ? meta.itemCount
        : catalog.itemCount,
    styleLabels: meta.styleLabels?.length
      ? meta.styleLabels
      : catalog.styleLabels,
    previewItems: catalog.previewItems ?? [],
  };
  return next;
}

/**
 * Merge durable public preview/thumbnail from media_assets into the product
 * media JSON when catalog_products.media omitted them (common after worker
 * processing without a republish that copied URLs onto the product row).
 * Never copies private master paths.
 */
function enrichAdminProductFromMediaAsset(
  product: AdminProduct,
  media: CatalogMediaPublicRow | undefined,
): AdminProduct {
  if (!media) return product;

  const previewFromAsset =
    media.preview_playback === "generated" &&
    isPublicCustomerMediaUrl(media.preview_url)
      ? media.preview_url!.trim()
      : "";
  const thumbFromAsset = isPublicCustomerMediaUrl(media.thumbnail_url)
    ? media.thumbnail_url!.trim()
    : "";

  if (!previewFromAsset && !thumbFromAsset) return product;

  const existingPreview = product.media.previewVideo?.trim() || "";
  const preferExistingPreview = isPublicCustomerMediaUrl(existingPreview);
  const previewRaw = preferExistingPreview
    ? existingPreview
    : previewFromAsset || existingPreview || "";
  const thumbRaw =
    thumbFromAsset || product.media.thumbnail?.trim() || "";

  return {
    ...product,
    media: {
      ...product.media,
      previewVideo: previewRaw
        ? withMediaCacheBust(previewRaw, media.updated_at)
        : undefined,
      thumbnail: thumbRaw
        ? withMediaCacheBust(thumbRaw, media.updated_at)
        : "",
    },
  };
}

/**
 * Convert catalog view rows + relationship rows into public CatalogProduct[].
 * Optional mediaRows supply public preview/thumbnail from media_assets.
 * Does not merge CMS/static products.
 */
export function mapCatalogViewsToProducts(
  productRows: CatalogProductRow[],
  relationshipRows: CatalogRelationshipRow[],
  mediaRows: CatalogMediaPublicRow[] = [],
): CatalogProduct[] {
  const byProduct = groupRelationships(relationshipRows);
  const mediaById = new Map(mediaRows.map((m) => [m.id, m]));

  const adminProducts: Array<
    AdminProduct & {
      _captionPublicMeta?: { itemCount?: number; styleLabels?: string[] };
    }
  > = [];

  for (const row of productRows) {
    const admin = catalogRowToAdminProduct(
      row,
      byProduct.get(row.id) ?? [],
    );
    if (!admin) continue;
    const mediaId = admin.mediaAssetId?.trim();
    adminProducts.push(
      enrichAdminProductFromMediaAsset(
        admin,
        mediaId ? mediaById.get(mediaId) : undefined,
      ),
    );
  }

  const settings = defaultImagePdpGlobalSettings();
  const out: CatalogProduct[] = [];

  for (const admin of adminProducts) {
    // Empty mediaAssets: storefront uses enriched product.media.previewVideo only.
    const mapped = adminProductToCatalog(
      admin,
      [],
      adminProducts,
      settings,
    );
    if (!mapped) continue;
    out.push(patchCaptionPackPublic(mapped, admin._captionPublicMeta));
  }

  return out;
}
