import type {
  AdminCharacter,
  AdminCollection,
  AdminProduct,
  MediaAsset,
} from "@/admin/types";
import { resolveCollectionThumbnail } from "@/admin/lib/resolveThumbnails";
import { enrichCollection, enrichVideo } from "@/data/conversion";
import { characters as staticCharacters } from "@/data/characters";
import { collections as staticCollections } from "@/data/collections";
import { videos as staticVideos } from "@/data/videos";
import {
  defaultImagePdpGlobalSettings,
  resolveDealSettings,
  resolvePricingTiers,
  type ImagePdpGlobalSettings,
} from "@/catalog/imagePdpTypes";
import type {
  AiImageProductPublic,
  Character,
  Collection,
  CatalogProduct,
  VideoProduct,
} from "@/types";
import {
  resolveAiImageFiles,
  resolvePublicPreviewUrl,
  resolveStorefrontProductImageUrl,
} from "@/admin/lib/resolveAiImageMedia";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { collectionToStorefrontPricing } from "@/admin/lib/collectionPricing";
import { resolveProductMedia } from "@/catalog/resolveProductMedia";
import { isSeedPlaceholderVideo } from "@/admin/lib/mediaPreview";
import { toPublicCaptionPackPreviewItem } from "@/catalog/contentPackTeaser";
import type { ProductType } from "@/catalog/productTypes";

function dedupeCatalogProductsBySlug(
  products: CatalogProduct[],
  updatedAtById: Map<string, string>,
): CatalogProduct[] {
  const bySlug = new Map<string, CatalogProduct>();
  const withoutSlug: CatalogProduct[] = [];

  for (const product of products) {
    if (!product.slug) {
      withoutSlug.push(product);
      continue;
    }
    const existing = bySlug.get(product.slug);
    if (!existing) {
      bySlug.set(product.slug, product);
      continue;
    }
    const existingUpdated = updatedAtById.get(existing.id) ?? "";
    const candidateUpdated = updatedAtById.get(product.id) ?? "";
    if (candidateUpdated >= existingUpdated) {
      bySlug.set(product.slug, product);
    }
  }

  return [...withoutSlug, ...Array.from(bySlug.values())];
}

function commonPricing(product: AdminProduct) {
  const usd = product.pricing?.USD;
  const inr = product.pricing?.INR;
  const price = usd?.currentPrice ?? usd?.regularPrice ?? 9.99;
  return {
    price,
    pricing: {
      india: {
        regularPrice: inr?.regularPrice ?? Math.round(price * 83),
        salePrice: inr?.currentPrice ?? Math.round(price * 83),
      },
      international: {
        regularPrice: usd?.regularPrice ?? price,
        salePrice: usd?.currentPrice ?? price,
      },
    } as VideoProduct["pricing"],
    offer: product.offer?.enabled
      ? {
          enabled: true as const,
          label: product.offer.label || "LAUNCH OFFER",
          discountText: product.offer.label || "SALE",
          endDate: product.offer.endDate,
        }
      : undefined,
  };
}

function relationIds(product: AdminProduct) {
  const rels = product.relationships ?? [];
  const addOns = rels
    .filter((r) => r.relationshipType === "ADD_ON")
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const addOnPriceOverrides: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  > = {};
  for (const r of addOns) {
    if (r.customPriceInr != null || r.customPriceUsd != null) {
      addOnPriceOverrides[r.relatedProductId] = {
        customPriceInr: r.customPriceInr,
        customPriceUsd: r.customPriceUsd,
      };
    }
  }
  return {
    addOnProductIds: addOns.map((r) => r.relatedProductId),
    addOnPriceOverrides:
      Object.keys(addOnPriceOverrides).length > 0
        ? addOnPriceOverrides
        : undefined,
    relatedProductIds: rels
      .filter((r) => r.relationshipType === "RELATED")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => r.relatedProductId),
    recommendedProductIds: rels
      .filter((r) => r.relationshipType === "RECOMMENDED")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((r) => r.relatedProductId),
  };
}

function basePublicFields(product: AdminProduct) {
  const { price, pricing, offer } = commonPricing(product);
  return {
    id: product.id,
    title: product.name,
    slug: product.slug,
    description: product.shortDescription || product.description,
    price,
    pricing,
    offer,
    category: product.category,
    tags: product.tags ?? [],
    thumbnail: product.media.thumbnail || "",
    isTrending: product.isTrending,
    isFeatured: product.isFeatured,
    isNew:
      Date.now() - new Date(product.createdAt).getTime() <
      1000 * 60 * 60 * 24 * 21,
    createdAt: product.createdAt.slice(0, 10),
    ...relationIds(product),
  };
}

/** Map any CMS product to a public catalog product (content locked where needed). */
export function adminProductToCatalog(
  product: AdminProduct,
  mediaAssets: MediaAsset[],
  allProducts: AdminProduct[] = [],
  imagePdpSettings: ImagePdpGlobalSettings = defaultImagePdpGlobalSettings(),
): CatalogProduct | null {
  const type = product.productType ?? "VIDEO";
  if (type === "VIDEO") return adminProductToVideo(product, mediaAssets);

  const base = basePublicFields(product);

  if (type === "PROMPT") {
    const data = product.promptData;
    return {
      ...base,
      productType: "PROMPT",
      shortDescription: product.shortDescription || undefined,
      publicTeaser: data?.publicTeaser || undefined,
      canGenerate: data?.canGenerate || undefined,
      sectionCount: data?.sectionCount ?? 1,
    };
  }

  if (type === "CAPTION_PACK") {
    const items = product.captionPackData?.items ?? [];
    const labels = [
      ...new Set(items.map((item) => item.label).filter(Boolean) as string[]),
    ];
    const short = product.shortDescription?.trim() || undefined;
    const long = product.description?.trim() || undefined;
    const previewItems = items
      .slice(0, 3)
      .map((item) => toPublicCaptionPackPreviewItem(item));
    return {
      ...base,
      productType: "CAPTION_PACK",
      shortDescription: short,
      description: long || short || "",
      itemCount: items.length,
      styleLabels: labels,
      previewItems,
    };
  }

  if (type === "AI_IMAGE") {
    const asset = product.mediaAssetId
      ? mediaAssets.find((a) => a.id === product.mediaAssetId)
      : undefined;

    // Public preview = watermarked derivative ONLY. Never fall back to clean master
    // or admin product.media.thumbnail (those are intentionally unwatermarked).
    const publicPreview = resolvePublicPreviewUrl(asset);

    // Legacy multi-image records — only accept explicit previewUrl fields
    const legacyImages = resolveAiImageFiles(
      product.aiImageData?.images,
      mediaAssets,
    );
    const legacyPreview =
      legacyImages.find((i) => i.isCover)?.previewUrl ||
      legacyImages[0]?.previewUrl ||
      "";

    const cover = publicPreview || legacyPreview || "";
    const previews = cover ? [cover] : [];

    const relations = relationIds(product);
    const whyCards = (product.pdpValueCards ?? [])
      .filter((c) => c.title.trim() || c.description.trim())
      .map((c) => ({
        badge: c.badge,
        title: c.title,
        description: c.description,
      }));

    let packUpgrade: AiImageProductPublic["packUpgrade"];
    let imageCollection: AiImageProductPublic["imageCollection"];

    const collectionId = product.aiImageData?.collectionId;
    const collectionName = product.aiImageData?.collectionName;

    const upgradeId = relations.relatedProductIds?.[0];
    let pack: AdminProduct | undefined;

    if (upgradeId) {
      pack = allProducts.find(
        (p) => p.id === upgradeId && (p.productType ?? "VIDEO") === "AI_IMAGE",
      );
    }

    if (!pack && collectionId) {
      pack = allProducts.find(
        (p) =>
          p.productType === "AI_IMAGE" &&
          p.aiImageData?.collectionId === collectionId &&
          p.aiImageData?.isCollectionPack,
      );
    }

    /** Resolve public previews for all single members of an image collection. */
    const collectionMemberPreviews = (colId: string) => {
      const members = allProducts.filter(
        (p) =>
          p.productType === "AI_IMAGE" &&
          !p.aiImageData?.isCollectionPack &&
          p.aiImageData?.collectionId === colId,
      );
      return members
        .map((p) => {
          const a = p.mediaAssetId
            ? mediaAssets.find((m) => m.id === p.mediaAssetId)
            : undefined;
          return (
            resolvePublicPreviewUrl(a) ||
            // Prefer watermarked preview only — do not fall back to clean master publicly
            ""
          );
        })
        .filter(Boolean);
    };

    if (pack) {
      const colId =
        collectionId || pack.aiImageData?.collectionId || pack.id;
      let allPreviews = collectionMemberPreviews(colId);
      // Legacy pack with embedded images[]
      if (!allPreviews.length) {
        allPreviews = resolveAiImageFiles(
          pack.aiImageData?.images,
          mediaAssets,
        )
          .map((img) => img.previewUrl || "")
          .filter(Boolean);
      }
      const packCover =
        allPreviews[0] ||
        resolvePublicPreviewUrl(
          pack.mediaAssetId
            ? mediaAssets.find((m) => m.id === pack.mediaAssetId)
            : undefined,
        ) ||
        "";
      const packPricingInr = pack.pricing?.INR?.currentPrice;
      const packPricingUsd = pack.pricing?.USD?.currentPrice;

      packUpgrade = {
        productId: pack.id,
        title: collectionName || pack.name.replace(/ — Full Collection$/, ""),
        slug: pack.slug,
        imageCount: allPreviews.length || 1,
        thumbnail: packCover,
        previewImages: allPreviews,
        collectionId: colId,
        collectionName: collectionName || pack.aiImageData?.collectionName,
        bundleSaleInr: packPricingInr,
        bundleSaleUsd: packPricingUsd,
        bundleCompareInr:
          pack.aiImageData?.collectionBundle?.compareAtInr ??
          pack.pricing?.INR?.regularPrice,
        bundleCompareUsd:
          pack.aiImageData?.collectionBundle?.compareAtUsd ??
          pack.pricing?.USD?.regularPrice,
        bundleBadgeText: pack.aiImageData?.collectionBundle?.badgeText,
      };

      imageCollection = {
        id: packUpgrade.collectionId || pack.id,
        name: packUpgrade.title,
        imageCount: packUpgrade.imageCount,
        previewImages: allPreviews,
      };
    } else if (collectionId && collectionName) {
      const memberPreviews = collectionMemberPreviews(collectionId);
      imageCollection = {
        id: collectionId,
        name: collectionName,
        imageCount: memberPreviews.length || 1,
        previewImages: memberPreviews.length
          ? memberPreviews
          : previews.length
            ? previews
            : cover
              ? [cover]
              : [],
      };
    }

    const dealSettings = resolveDealSettings(
      product.aiImageData?.dealSettings,
      imagePdpSettings.dealDefaults,
    );
    const pricingTiers = resolvePricingTiers(
      product.aiImageData?.pricingTiers,
      imagePdpSettings.pricingTiers,
    );

    return {
      ...base,
      productType: "AI_IMAGE",
      thumbnail: cover || base.thumbnail,
      imageCount: 1,
      resolution:
        product.aiImageData?.resolution ||
        asset?.master.resolution ||
        product.resolution,
      format: product.aiImageData?.format || product.format,
      access: product.access || "Instant access",
      previewImages: previews.length ? previews : cover ? [cover] : [],
      salesEyebrow: product.campaign?.label || undefined,
      salesHeadline: product.campaign?.headline || undefined,
      supportingCopy:
        product.campaign?.supportingText ||
        product.description ||
        undefined,
      whyCards: whyCards.length ? whyCards : undefined,
      packUpgrade,
      imageCollection,
      dealSettings,
      pricingTiers,
      quantityUpsells: product.aiImageData?.quantityUpsells,
      introTimerDays: product.aiImageData?.introTimerDays,
      introTimerExtensionHours: product.aiImageData?.introTimerExtensionHours,
      introTimerMinutes: product.aiImageData?.introTimerMinutes,
      ...relations,
    };
  }

  if (type === "BUNDLE") {
    const includedIds =
      product.bundleData?.includedProductIds ??
      (product.relationships ?? [])
        .filter((r) => r.relationshipType === "INCLUDED_IN_BUNDLE")
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((r) => r.relatedProductId);
    const included = includedIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean) as AdminProduct[];
    const summaries = included.map((p) => ({
      id: p.id,
      title: p.name,
      productType: p.productType ?? "VIDEO",
      thumbnail:
        p.productType === "AI_IMAGE"
          ? resolveStorefrontProductImageUrl(p, mediaAssets)
          : p.media.thumbnail ||
            resolveProductThumbnail(p, mediaAssets) ||
            "",
      price: p.pricing?.USD?.currentPrice ?? p.pricing?.USD?.regularPrice ?? 0,
    }));
    const individualTotal = summaries.reduce((sum, s) => sum + s.price, 0);
    const bundlePrice = base.price;
    return {
      ...base,
      productType: "BUNDLE",
      includedProductIds: includedIds,
      includedSummaries: summaries,
      individualTotal:
        product.bundleData?.compareAtTotalUsd ?? individualTotal,
      savings: Math.max(
        0,
        (product.bundleData?.compareAtTotalUsd ?? individualTotal) - bundlePrice,
      ),
    };
  }

  return null;
}

function formatResolutionDisplay(resolution: string) {
  const cleaned = resolution.trim();
  if (!cleaned) return "1080 × 1920";
  return cleaned.replace(/[xX×]/g, " × ").replace(/\s+/g, " ").trim();
}

function mapFileDetails(p: AdminProduct): VideoProduct["fileDetails"] {
  const fd = p.fileDetails;
  return {
    dimensionsMain: formatResolutionDisplay(p.resolution || "1080x1920"),
    dimensionsSupporting:
      fd?.dimensionsSupporting?.trim() || "Full HD vertical video",
    formatMain: (p.format || "MP4").trim() || "MP4",
    formatSupporting: fd?.formatSupporting?.trim() || "Ready-to-post file",
    accessMain: (p.access || "Instant access").trim() || "Instant access",
    accessSupporting:
      fd?.accessSupporting?.trim() || "Download after checkout",
    usageMain: fd?.usageMain?.trim() || "Personal + social",
    usageSupporting:
      fd?.usageSupporting?.trim() || "Use it in your own content",
  };
}

function mapPdpValueCards(
  p: AdminProduct,
): VideoProduct["pdpValueCards"] | undefined {
  const cards = p.pdpValueCards?.filter(
    (c) => c.badge.trim() || c.title.trim() || c.description.trim(),
  );
  if (!cards?.length) return undefined;
  return cards.map((c) => ({
    badge: c.badge,
    title: c.title,
    description: c.description,
  }));
}

function mapPerformance(
  p: AdminProduct,
): VideoProduct["performance"] | undefined {
  const perf = p.performance;
  if (!perf) return undefined;
  const type =
    perf.status === "trending" || perf.status === "viral"
      ? ("trending" as const)
      : perf.status === "high-engagement"
        ? ("engagement-spike" as const)
        : ("scroll-stopper" as const);
  return {
    type,
    primaryMetric: perf.plays,
    primaryNumeric: perf.playsNumeric,
    primaryLabel: (perf.metricLabel || "PLAYS").trim() || "PLAYS",
    secondaryMetrics: [
      { label: "Likes", value: perf.likes, numeric: perf.likesNumeric },
      { label: "Shares", value: perf.shares, numeric: perf.sharesNumeric },
    ],
    insight: perf.insight,
    badge: perf.badge,
    supportingText: perf.supportingText,
    momentumLabel: perf.momentumLabel,
    engagementText: perf.engagementText,
    mode: "demo",
  };
}

function mapActivity(p: AdminProduct): VideoProduct["activity"] | undefined {
  const a = p.creatorActivity;
  if (!a) return undefined;
  const activityLevel =
    a.activityLevel === "high"
      ? ("high" as const)
      : a.activityLevel === "normal"
        ? ("steady" as const)
        : ("rising" as const);
  return {
    mode: "demo",
    addedThisWeek: a.addedThisWeek,
    saved: a.saved,
    last24h: a.last24h,
    activityLevel,
    note: a.note,
  };
}

/** Map a CMS product + media into a storefront VideoProduct. */
export function adminProductToVideo(
  product: AdminProduct,
  mediaAssets: MediaAsset[],
): VideoProduct {
  const resolved = resolveProductMedia(product, mediaAssets);
  const usd = product.pricing?.USD;
  const inr = product.pricing?.INR;
  const price = usd?.currentPrice ?? usd?.regularPrice ?? 12.99;
  const relations = relationIds(product);

  const base: VideoProduct = {
    id: product.id,
    title: product.name,
    slug: product.slug,
    productType: "VIDEO",
    characterId: product.characterId,
    characterName: product.characterName,
    description: product.shortDescription || product.description,
    price,
    pricing: {
      india: {
        regularPrice: inr?.regularPrice ?? Math.round(price * 83),
        salePrice: inr?.currentPrice ?? Math.round(price * 83),
      },
      international: {
        regularPrice: usd?.regularPrice ?? price,
        salePrice: usd?.currentPrice ?? price,
      },
    },
    offer: product.offer?.enabled
      ? {
          enabled: true,
          label: product.offer.label || "LAUNCH OFFER",
          discountText: /launch/i.test(product.offer.label || "")
            ? "Launch price"
            : product.offer.label || "SALE",
          endDate: product.offer.endDate,
        }
      : undefined,
    category: product.category,
    tags: product.tags ?? [],
    thumbnail: resolved?.thumbnail || product.media.thumbnail || "",
    previewVideo: resolved?.previewVideo || undefined,
    duration: product.duration,
    resolution: product.resolution,
    isTrending: product.isTrending,
    isFeatured: product.isFeatured,
    isNew:
      Date.now() - new Date(product.createdAt).getTime() <
      1000 * 60 * 60 * 24 * 21,
    collectionIds: product.collectionIds ?? [],
    createdAt: product.createdAt.slice(0, 10),
    format: product.format || "MP4",
    access: product.access || "Instant access",
    performance: mapPerformance(product),
    activity: mapActivity(product),
    showCardMetrics: Boolean(product.performance),
    pdpValueCards: mapPdpValueCards(product),
    fileDetails: mapFileDetails(product),
    ...relations,
  };

  // Never fall back to static demo media OR master when a CMS media asset is attached.
  const enriched = enrichVideo(base);
  const hasCmsMedia = Boolean(product.mediaAssetId);
  const previewVideo =
    resolved?.previewVideo || (hasCmsMedia ? undefined : enriched.previewVideo);
  // Guard: never ship master URL or seed placeholder paths to storefront
  const masterUrl = resolved?.asset?.master.url;
  const safePreview =
    !previewVideo ||
    isSeedPlaceholderVideo(previewVideo) ||
    (masterUrl && previewVideo === masterUrl)
      ? undefined
      : previewVideo;

  const performance = mergePerformance(
    base.performance,
    enriched.performance,
  );

  return {
    ...enriched,
    ...base,
    productType: "VIDEO",
    pricing: base.pricing ?? enriched.pricing,
    offer: base.offer ?? enriched.offer,
    performance,
    activity: base.activity ?? enriched.activity,
    creatorRating: enriched.creatorRating ?? base.creatorRating,
    creatorInsights: enriched.creatorInsights ?? base.creatorInsights,
    socialRotation: enriched.socialRotation ?? base.socialRotation,
    pdpValueCards: base.pdpValueCards ?? enriched.pdpValueCards,
    fileDetails: base.fileDetails ?? enriched.fileDetails,
    access: base.access || enriched.access,
    thumbnail: base.thumbnail || (hasCmsMedia ? "" : enriched.thumbnail),
    previewVideo: safePreview,
  };
}

function mergePerformance(
  cms: VideoProduct["performance"] | undefined,
  fallback: VideoProduct["performance"] | undefined,
): VideoProduct["performance"] | undefined {
  if (!cms) return fallback;
  if (!fallback) return cms;
  return {
    ...fallback,
    ...cms,
    primaryLabel: cms.primaryLabel || fallback.primaryLabel,
    insight: cms.insight || fallback.insight,
    badge: cms.badge || fallback.badge,
    supportingText: cms.supportingText || fallback.supportingText,
    momentumLabel: cms.momentumLabel || fallback.momentumLabel,
    engagementText: cms.engagementText || fallback.engagementText,
    aboveAverage: cms.aboveAverage || fallback.aboveAverage,
  };
}

export function adminCollectionToStorefront(
  collection: AdminCollection,
  products: AdminProduct[],
  mediaAssets: MediaAsset[],
): Collection {
  let coverImage = resolveCollectionThumbnail(
    collection,
    products,
    mediaAssets,
  );

  // Admin collection thumbs use clean master for AI_IMAGE — swap to public preview.
  const coverProductId =
    collection.coverMode === "single"
      ? collection.coverProductId
      : collection.productIds[0];
  const coverProduct = coverProductId
    ? products.find((p) => p.id === coverProductId)
    : undefined;
  if (coverProduct?.productType === "AI_IMAGE") {
    coverImage =
      resolveStorefrontProductImageUrl(coverProduct, mediaAssets) ||
      collection.coverCustomUrl ||
      collection.coverImage ||
      "";
  }

  const characterId =
    collection.characterRules?.[0]?.characterId ??
    products.find((p) => collection.productIds.includes(p.id))?.characterId;
  const storefrontPricing = collectionToStorefrontPricing(collection);
  const base: Collection = {
    id: collection.id,
    title: collection.name,
    slug: collection.slug,
    description: collection.description,
    coverImage: coverImage || collection.coverImage,
    videoIds: [...collection.productIds],
    characterId,
    price: storefrontPricing.price,
    originalPrice: storefrontPricing.originalPrice,
    pricing: storefrontPricing.pricing,
    offer: storefrontPricing.offer,
    featured: collection.featured,
  };
  return base;
}

export function adminCharacterToStorefront(
  character: AdminCharacter,
): Character {
  return {
    id: character.id,
    name: character.name,
    slug: character.slug,
    description: character.description,
    shortDescription: character.shortBio,
    image: character.image,
    accentColor: character.accentColor,
    videoCount: character.productCount,
    collectionCount: character.collectionCount,
  };
}

export type StorefrontCatalog = {
  videos: VideoProduct[];
  /** All sellable catalog products across types (public-safe). */
  products: CatalogProduct[];
  collections: Collection[];
  characters: Character[];
  /** Global Image PDP bundle pricing & deal defaults from CMS. */
  imagePdpSettings: ImagePdpGlobalSettings;
  getVideoBySlug: (slug: string) => VideoProduct | undefined;
  getVideoById: (id: string) => VideoProduct | undefined;
  getVideosByCharacter: (characterId: string) => VideoProduct[];
  getTrendingVideos: (limit?: number) => VideoProduct[];
  getRelatedVideos: (video: VideoProduct, limit?: number) => VideoProduct[];
  getProductBySlug: (slug: string) => CatalogProduct | undefined;
  getProductById: (id: string) => CatalogProduct | undefined;
  getProductsByType: (type: ProductType) => CatalogProduct[];
  getCollectionBySlug: (slug: string) => Collection | undefined;
  getCollectionById: (id: string) => Collection | undefined;
  getFeaturedCollection: () => Collection | undefined;
  getCollectionsByCharacter: (characterId: string) => Collection[];
  getCharacterBySlug: (slug: string) => Character | undefined;
  getCharacterById: (id: string) => Character | undefined;
};

/**
 * Build the live storefront catalog from CMS state.
 * CMS products/collections/characters win on ID/slug collision;
 * static seed fills gaps for IDs not present in CMS.
 */
export function buildStorefrontCatalog(
  products: AdminProduct[],
  mediaAssets: MediaAsset[],
  collections: AdminCollection[],
  characters: AdminCharacter[],
  imagePdpSettings: ImagePdpGlobalSettings = defaultImagePdpGlobalSettings(),
): StorefrontCatalog {
  const activeProducts = products.filter((p) => p.status === "active");
  const updatedAtById = new Map(
    products.map((p) => [p.id, p.updatedAt ?? p.createdAt ?? ""]),
  );
  const cmsManagedIds = new Set(products.map((p) => p.id));
  const cmsManagedSlugs = new Set(products.map((p) => p.slug));

  // Recompute collectionIds from admin collections (source of truth)
  const collectionMembership = new Map<string, string[]>();
  for (const col of collections) {
    if (col.status !== "active") continue;
    for (const pid of col.productIds) {
      const list = collectionMembership.get(pid) ?? [];
      list.push(col.id);
      collectionMembership.set(pid, list);
    }
  }

  const catalogProducts: CatalogProduct[] = [];
  for (const p of activeProducts) {
    const mapped = adminProductToCatalog(
      p,
      mediaAssets,
      products,
      imagePdpSettings,
    );
    if (!mapped) continue;
    if (mapped.productType === "VIDEO") {
      catalogProducts.push({
        ...mapped,
        collectionIds:
          collectionMembership.get(mapped.id) ?? mapped.collectionIds,
      });
    } else {
      catalogProducts.push(mapped);
    }
  }

  const staticExtras = staticVideos
    .filter((v) => !cmsManagedIds.has(v.id) && !cmsManagedSlugs.has(v.slug))
    .map(
      (v): VideoProduct => ({
        ...v,
        productType: "VIDEO",
      }),
    );

  const allProducts = dedupeCatalogProductsBySlug(
    [...catalogProducts, ...staticExtras],
    updatedAtById,
  );
  const productsBySlug = new Map(allProducts.map((p) => [p.slug, p]));
  const videos = allProducts.filter(
    (p): p is VideoProduct => p.productType === "VIDEO",
  );

  const activeCollections = collections.filter((c) => c.status === "active");
  const cmsCollections = activeCollections.map((c) =>
    adminCollectionToStorefront(c, products, mediaAssets),
  );
  const managedColIds = new Set(collections.map((c) => c.id));
  const managedColSlugs = new Set(collections.map((c) => c.slug));
  const collectionExtras = staticCollections.filter(
    (c) => !managedColIds.has(c.id) && !managedColSlugs.has(c.slug),
  );
  const storeCollections = [...cmsCollections, ...collectionExtras];

  const visibleCharacters = characters.filter(
    (c) => c.status === "active" || c.status === "hidden",
  );
  const cmsCharacters = visibleCharacters
    .filter((c) => c.showOnCharactersPage !== false && c.status === "active")
    .map(adminCharacterToStorefront);
  const managedCharIds = new Set(characters.map((c) => c.id));
  const managedCharSlugs = new Set(characters.map((c) => c.slug));
  const characterExtras = staticCharacters.filter(
    (c) => !managedCharIds.has(c.id) && !managedCharSlugs.has(c.slug),
  );
  // Recompute counts from live videos/collections
  const storeCharacters = [...cmsCharacters, ...characterExtras].map((c) => ({
    ...c,
    videoCount: videos.filter((v) => v.characterId === c.id).length,
    collectionCount: storeCollections.filter((col) => col.characterId === c.id)
      .length,
  }));

  return {
    videos,
    products: allProducts,
    collections: storeCollections,
    characters: storeCharacters,
    imagePdpSettings,
    getVideoBySlug: (slug) => videos.find((v) => v.slug === slug),
    getVideoById: (id) => videos.find((v) => v.id === id),
    getVideosByCharacter: (characterId) =>
      videos.filter((v) => v.characterId === characterId),
    getTrendingVideos: (limit = 10) =>
      videos.filter((v) => v.isTrending).slice(0, limit),
    getRelatedVideos: (video, limit = 4) =>
      videos
        .filter(
          (v) =>
            v.id !== video.id &&
            (v.characterId === video.characterId ||
              v.category === video.category),
        )
        .slice(0, limit),
    getProductBySlug: (slug) => productsBySlug.get(slug),
    getProductById: (id) => allProducts.find((p) => p.id === id),
    getProductsByType: (type) =>
      allProducts.filter((p) => p.productType === type),
    getCollectionBySlug: (slug) =>
      storeCollections.find((c) => c.slug === slug),
    getCollectionById: (id) => storeCollections.find((c) => c.id === id),
    getFeaturedCollection: () =>
      storeCollections.find((c) => c.featured) ?? storeCollections[0],
    getCollectionsByCharacter: (characterId) =>
      storeCollections.filter((c) => c.characterId === characterId),
    getCharacterBySlug: (slug) => storeCharacters.find((c) => c.slug === slug),
    getCharacterById: (id) => storeCharacters.find((c) => c.id === id),
  };
}

/** Static fallback catalog before CMS hydrates (SSR / first paint). */
export function buildStaticCatalog(): StorefrontCatalog {
  return buildStorefrontCatalog([], [], [], []);
}
