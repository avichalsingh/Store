import type { AdminProduct } from "@/admin/types";
import { migrateAdminProductPackTypes, migrateCaptionPackData } from "@/catalog/captionPackMigration";
import { isProductType } from "@/catalog/productTypes";
import {
  defaultTypeData,
  emptyAiImageData,
  emptyBundleData,
  emptyCaptionPackData,
  emptyPromptData,
} from "@/catalog/productPayloads";
import { normalizeBundleCoverData } from "@/admin/lib/bundleCover";

/**
 * Migrate legacy CMS products → multi-type shape.
 * Existing records without productType become VIDEO.
 */
export function normalizeAdminProduct(
  raw: Partial<AdminProduct> & { id: string },
): AdminProduct {
  const migrated = migrateAdminProductPackTypes(raw);
  const productType = isProductType(migrated.productType)
    ? migrated.productType
    : "VIDEO";
  const typeDefaults = defaultTypeData(productType);

  const relationships = Array.isArray(migrated.relationships)
    ? migrated.relationships
    : [];

  let bundleData = migrated.bundleData ?? typeDefaults.bundleData;
  if (productType === "BUNDLE") {
    const includedFromRels = relationships
      .filter((r) => r.relationshipType === "INCLUDED_IN_BUNDLE")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => r.relatedProductId);
    bundleData = normalizeBundleCoverData({
      ...(bundleData ?? emptyBundleData()),
      includedProductIds:
        includedFromRels.length > 0
          ? includedFromRels
          : (bundleData?.includedProductIds ?? []),
    });
  }

  let captionPackData = migrated.captionPackData ?? typeDefaults.captionPackData;
  if (productType === "CAPTION_PACK") {
    captionPackData = migrateCaptionPackData(captionPackData);
  }

  return {
    id: migrated.id,
    name: migrated.name ?? "",
    slug: migrated.slug ?? "",
    productType,
    characterId: migrated.characterId,
    characterName: migrated.characterName,
    category: migrated.category ?? "",
    collectionIds: migrated.collectionIds ?? [],
    shortDescription: migrated.shortDescription ?? "",
    description: migrated.description ?? "",
    tags: migrated.tags ?? [],
    status: migrated.status ?? "draft",
    isTrending: Boolean(migrated.isTrending),
    isFeatured: Boolean(migrated.isFeatured),
    mediaAssetId: migrated.mediaAssetId,
    media: migrated.media ?? { thumbnail: "" },
    thumbnailMode: migrated.thumbnailMode,
    watermarkMode: migrated.watermarkMode,
    watermarkOverride: migrated.watermarkOverride,
    previewQuality: migrated.previewQuality,
    pricing: migrated.pricing ?? {
      INR: { regularPrice: 0, currentPrice: 0 },
      USD: { regularPrice: 0, currentPrice: 0 },
    },
    offer: migrated.offer ?? { enabled: false, label: "" },
    performance: {
      mode:
        (migrated.performance?.mode as AdminProduct["performance"]["mode"]) ??
        "demo",
      plays: migrated.performance?.plays ?? "0",
      playsNumeric: migrated.performance?.playsNumeric ?? 0,
      likes: migrated.performance?.likes ?? "0",
      likesNumeric: migrated.performance?.likesNumeric ?? 0,
      shares: migrated.performance?.shares ?? "0",
      sharesNumeric: migrated.performance?.sharesNumeric ?? 0,
      engagementPct: migrated.performance?.engagementPct ?? 0,
      status: migrated.performance?.status ?? "normal",
      badge: migrated.performance?.badge ?? "",
      insight: migrated.performance?.insight ?? "",
      metricLabel: migrated.performance?.metricLabel,
      engagementText: migrated.performance?.engagementText,
      supportingText: migrated.performance?.supportingText,
      momentumLabel: migrated.performance?.momentumLabel,
    },
    creatorActivity: migrated.creatorActivity ?? {
      mode: "demo",
      addedThisWeek: 0,
      saved: 0,
      last24h: 0,
      activityLevel: "normal",
      note: "",
    },
    campaign: migrated.campaign ?? {
      enabled: false,
      label: "",
      headline: "",
      supportingText: "",
      ctaText: "",
      microMessages: [],
    },
    availability: migrated.availability ?? { mode: "unlimited" },
    duration: migrated.duration ?? "",
    resolution: migrated.resolution ?? "",
    format: migrated.format ?? (productType === "VIDEO" ? "MP4" : ""),
    access: migrated.access ?? "Instant download",
    licenses: migrated.licenses ?? [],
    pdpValueCards: Array.isArray(migrated.pdpValueCards)
      ? migrated.pdpValueCards.map((c) => ({
          badge: c?.badge ?? "",
          title: c?.title ?? "",
          description: c?.description ?? "",
        }))
      : undefined,
    fileDetails: migrated.fileDetails
      ? {
          dimensionsSupporting: migrated.fileDetails.dimensionsSupporting,
          formatSupporting: migrated.fileDetails.formatSupporting,
          accessSupporting: migrated.fileDetails.accessSupporting,
          usageMain: migrated.fileDetails.usageMain,
          usageSupporting: migrated.fileDetails.usageSupporting,
        }
      : undefined,
    sales: migrated.sales ?? 0,
    revenueInr: migrated.revenueInr ?? 0,
    relationships,
    promptData:
      productType === "PROMPT"
        ? { ...emptyPromptData(), ...migrated.promptData }
        : migrated.promptData,
    captionPackData:
      productType === "CAPTION_PACK" ? captionPackData : migrated.captionPackData,
    hashtagPackData: undefined,
    aiImageData:
      productType === "AI_IMAGE"
        ? { ...emptyAiImageData(), ...migrated.aiImageData }
        : migrated.aiImageData,
    bundleData: productType === "BUNDLE" ? bundleData : migrated.bundleData,
    createdAt: migrated.createdAt ?? new Date().toISOString(),
    updatedAt: migrated.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeAdminProducts(
  products: Partial<AdminProduct>[],
): AdminProduct[] {
  const normalized = products
    .filter((p): p is Partial<AdminProduct> & { id: string } => Boolean(p?.id))
    .map(normalizeAdminProduct);

  const byId = new Map<string, AdminProduct>();
  for (const product of normalized) {
    const existing = byId.get(product.id);
    if (!existing) {
      byId.set(product.id, product);
      continue;
    }
    if ((product.updatedAt ?? "") >= (existing.updatedAt ?? "")) {
      byId.set(product.id, product);
    }
  }
  return Array.from(byId.values());
}
