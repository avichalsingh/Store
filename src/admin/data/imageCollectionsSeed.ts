/**
 * Image collection definitions + product generator for marketplace seed.
 * Each image belongs to exactly one collection; singles link to a pack SKU.
 */

import { normalizeAdminProduct } from "@/admin/lib/normalizeProduct";
import type { AdminProduct } from "@/admin/types";
import type { AiImageData } from "@/catalog/productPayloads";

const now = "2026-08-26T12:00:00.000Z";

const M = {
  mango: "/media/videos/mango-pop.jpg",
  sunshine: "/media/videos/sunshine-snap.jpg",
  confetti: "/media/videos/confetti-kick.jpg",
  firecracker: "/media/videos/firecracker.jpg",
  neon: "/media/videos/neon-shuffle.jpg",
  moon: "/media/videos/moon-groove.jpg",
  spark: "/media/videos/spark-parade.jpg",
  pulse: "/media/videos/pulse-drop.jpg",
  bounce: "/media/videos/beat-bounce.jpg",
  orbit: "/media/videos/orbit-hop.jpg",
  glitch: "/media/videos/glitch-party.jpg",
  scroll: "/media/videos/scroll-stopper.jpg",
  mirror: "/media/videos/mirror-wave.jpg",
  velvet: "/media/videos/velvet-turn.jpg",
  saffron: "/media/videos/saffron-swing.jpg",
  drift: "/media/videos/drift-mode.jpg",
  milo: "/media/characters/milo.jpg",
  zara: "/media/characters/zara.jpg",
  nia: "/media/characters/nia.jpg",
  kai: "/media/characters/kai.jpg",
  leo: "/media/characters/leo.jpg",
  rio: "/media/characters/rio.jpg",
  cute: "/media/categories/cute-fun.jpg",
  funny: "/media/categories/funny.jpg",
  trending: "/media/categories/trending.jpg",
  viral: "/media/categories/viral-moves.jpg",
  chill: "/media/categories/chill.jpg",
  bollywood: "/media/categories/bollywood.jpg",
} as const;

/** Basename → durable public master path for seed/marketplace images. */
const SEED_PUBLIC_IMAGE_BY_BASENAME = new Map<string, string>(
  Object.values(M).map((url) => {
    const base = (url.split("/").pop() || "").toLowerCase();
    return [base, url] as const;
  }),
);

/**
 * Recover the clean original public URL for a seed-derived image asset.
 * Used when CMS wiped master.url after preview encode but originalFileName remains.
 */
export function lookupSeedPublicImageUrl(
  fileName: string | undefined | null,
): string {
  if (!fileName) return "";
  const base = fileName
    .replace(/^preview-(standard|optimized|high)-/i, "")
    .split(/[\\/]/)
    .pop()
    ?.toLowerCase();
  if (!base) return "";
  return SEED_PUBLIC_IMAGE_BY_BASENAME.get(base) || "";
}

export type ImageCollectionDef = {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  imageUrls: string[];
  /** Pack product id */
  packProductId: string;
  /** Hero single product id (PDP entry for collection) */
  heroProductId: string;
  /** Individual single product ids (one per image, same order as imageUrls) */
  singleProductIds: string[];
  bundleSaleInr: number;
  bundleRegularInr?: number;
  bundleSaleUsd: number;
  bundleRegularUsd?: number;
  featured?: boolean;
  trending?: boolean;
};

export const IMAGE_COLLECTIONS: ImageCollectionDef[] = [
  {
    id: "col-cute-indian",
    name: "Cute Indian Cartoon Girl",
    slug: "cute-indian-cartoon-girl",
    category: "Characters",
    tags: ["cute", "cartoon", "indian", "girl", "character"],
    imageUrls: [M.nia, M.saffron, M.sunshine, M.cute],
    packProductId: "prod-image-001-pack",
    heroProductId: "prod-image-001",
    singleProductIds: [
      "prod-image-001",
      "prod-image-005",
      "prod-image-006",
      "prod-image-007",
    ],
    bundleSaleInr: 999,
    bundleSaleUsd: 12.99,
    featured: true,
    trending: true,
  },
  {
    id: "col-neon-night",
    name: "Neon Night / Party Vibes",
    slug: "neon-night-party-vibes",
    category: "Party",
    tags: ["neon", "party", "night", "vibes", "glow"],
    imageUrls: [M.neon, M.glitch, M.firecracker, M.confetti, M.pulse],
    packProductId: "prod-image-002-pack",
    heroProductId: "prod-image-002",
    singleProductIds: [
      "prod-image-002",
      "prod-image-008",
      "prod-image-009",
      "prod-image-010",
      "prod-image-011",
    ],
    bundleSaleInr: 1299,
    bundleSaleUsd: 15.99,
    trending: true,
  },
  {
    id: "col-dreamy-nature",
    name: "Dreamy Waterfalls & Nature",
    slug: "dreamy-waterfalls-nature",
    category: "Nature",
    tags: ["nature", "waterfall", "dreamy", "landscape", "calm"],
    imageUrls: [
      M.moon,
      M.drift,
      M.mirror,
      M.orbit,
      M.bounce,
      M.chill,
      M.velvet,
      M.scroll,
      M.spark,
      M.sunshine,
      M.kai,
      M.leo,
    ],
    packProductId: "prod-image-003-pack",
    heroProductId: "prod-image-003",
    singleProductIds: [
      "prod-image-003",
      "prod-image-012",
      "prod-image-013",
      "prod-image-014",
      "prod-image-015",
      "prod-image-016",
      "prod-image-017",
      "prod-image-018",
      "prod-image-019",
      "prod-image-020",
      "prod-image-021",
      "prod-image-022",
    ],
    bundleSaleInr: 1999,
    bundleSaleUsd: 24.99,
  },
  {
    id: "col-cinematic-travel",
    name: "Cinematic Travel Collection",
    slug: "cinematic-travel-collection",
    category: "Travel",
    tags: ["travel", "cinematic", "landscape", "wanderlust", "reels"],
    imageUrls: [
      M.rio,
      M.zara,
      M.milo,
      M.bollywood,
      M.trending,
      M.viral,
      M.neon,
      M.moon,
      M.drift,
      M.mirror,
      M.orbit,
      M.bounce,
      M.pulse,
      M.spark,
      M.scroll,
      M.glitch,
      M.firecracker,
      M.confetti,
      M.saffron,
      M.velvet,
    ],
    packProductId: "prod-image-004-pack",
    heroProductId: "prod-image-004",
    singleProductIds: [
      "prod-image-004",
      "prod-image-023",
      "prod-image-024",
      "prod-image-025",
      "prod-image-026",
      "prod-image-027",
      "prod-image-028",
      "prod-image-029",
      "prod-image-030",
      "prod-image-031",
      "prod-image-032",
      "prod-image-033",
      "prod-image-034",
      "prod-image-035",
      "prod-image-036",
      "prod-image-037",
      "prod-image-038",
      "prod-image-039",
      "prod-image-040",
      "prod-image-041",
    ],
    bundleSaleInr: 2999,
    bundleSaleUsd: 36.99,
    featured: true,
  },
];

function money(inrReg: number, inrCur: number, usdReg: number, usdCur: number) {
  return {
    INR: { regularPrice: inrReg, currentPrice: inrCur },
    USD: { regularPrice: usdReg, currentPrice: usdCur },
  };
}

function meta(opts: {
  badge: string;
  sales: number;
  revenueInr: number;
  trending?: boolean;
  featured?: boolean;
}) {
  return {
    status: "active" as const,
    isTrending: Boolean(opts.trending),
    isFeatured: Boolean(opts.featured),
    offer: { enabled: false, label: "" },
    performance: {
      mode: "demo" as const,
      plays: "0",
      playsNumeric: 0,
      likes: "0",
      likesNumeric: 0,
      shares: "0",
      sharesNumeric: 0,
      engagementPct: 0,
      status: "normal" as const,
      badge: opts.badge,
      insight: "",
    },
    creatorActivity: {
      mode: "demo" as const,
      addedThisWeek: 12 + (opts.sales % 40),
      saved: 40 + opts.sales,
      last24h: 2 + (opts.sales % 8),
      activityLevel: "normal" as const,
      note: "Demo marketplace image.",
    },
    campaign: {
      enabled: false,
      label: "",
      headline: "",
      supportingText: "",
      ctaText: "",
      microMessages: [] as string[],
    },
    availability: { mode: "unlimited" as const },
    duration: "",
    resolution: "",
    format: "",
    licenses: [],
    sales: opts.sales,
    revenueInr: opts.revenueInr,
    collectionIds: [] as string[],
    updatedAt: now,
  };
}

function imgs(prefix: string, urls: string[]) {
  return urls.map((url, i) => ({
    id: `${prefix}-${i + 1}`,
    url,
    previewUrl: url,
    fileName: `${prefix}-${i + 1}.png`,
    isCover: i === 0,
    sizeLabel: "2.4 MB",
  }));
}

function collectionAiImageData(
  def: ImageCollectionDef,
  urls: string[],
  prefix: string,
  extra?: Partial<AiImageData>,
): AiImageData {
  return {
    resolution: "2048x2048",
    format: "PNG",
    fileSizeLabel: urls.length > 1 ? "2–3 MB each" : "2.4 MB",
    collectionId: def.id,
    collectionName: def.name,
    images: imgs(prefix, urls),
    ...extra,
  };
}

function product(
  partial: Omit<AdminProduct, "productType" | "relationships"> &
    Partial<Pick<AdminProduct, "productType" | "relationships">> & { id: string },
): AdminProduct {
  return normalizeAdminProduct(partial);
}

const SINGLE_SALE_INR = 799;
const SINGLE_REG_INR = 999;
const SINGLE_SALE_USD = 9.99;
const SINGLE_REG_USD = 12.99;

/** Build all pack + single AI image products from collection definitions. */
export function buildImageCollectionProducts(): AdminProduct[] {
  const products: AdminProduct[] = [];

  for (const def of IMAGE_COLLECTIONS) {
    const count = def.imageUrls.length;
    const compareInr = def.bundleRegularInr ?? SINGLE_REG_INR * count;
    const compareUsd = def.bundleRegularUsd ?? SINGLE_REG_USD * count;

    products.push(
      product({
        id: def.packProductId,
        name: `${def.name} — Full Collection`,
        slug: `${def.slug}-collection`,
        productType: "AI_IMAGE",
        category: def.category,
        shortDescription: `All ${count} images from the ${def.name} collection.`,
        description: `Complete ${def.name} collection — every image included at the best bundle price.`,
        tags: [...def.tags, "collection", "pack"],
        media: { thumbnail: def.imageUrls[0]! },
        pricing: money(compareInr, def.bundleSaleInr, compareUsd, def.bundleSaleUsd),
        ...meta({
          badge: "Collection",
          sales: 40 + count * 3,
          revenueInr: def.bundleSaleInr * (20 + count),
        }),
        offer: {
          enabled: true,
          label: "BEST VALUE BUNDLE",
        },
        campaign: {
          enabled: true,
          label: "FULL COLLECTION",
          headline: `All ${count} images. One unbeatable price.`,
          supportingText: "",
          ctaText: "Get the full collection",
          microMessages: [],
        },
        access: "Instant access",
        resolution: "2048x2048",
        format: "PNG",
        aiImageData: collectionAiImageData(def, def.imageUrls, def.slug, {
          isCollectionPack: true,
          collectionBundle: {
            compareAtInr: compareInr,
            compareAtUsd: compareUsd,
            badgeText:
              count >= 12 ? "MASSIVE COLLECTION DEAL" : "BEST VALUE",
          },
        }),
        createdAt: "2026-08-10T08:30:00.000Z",
      }),
    );

    def.imageUrls.forEach((url, index) => {
      const id = def.singleProductIds[index]!;
      const isHero = id === def.heroProductId;
      const slug = isHero
        ? def.slug
        : `${def.slug}-${String(index + 1).padStart(2, "0")}`;
      const name = isHero
        ? def.name
        : `${def.name} — Image ${index + 1}`;

      products.push(
        product({
          id,
          name,
          slug,
          productType: "AI_IMAGE",
          category: def.category,
          shortDescription: "One image. Endless ways to make it yours.",
          description: `A single image from the ${def.name} collection.`,
          tags: [...def.tags, "single"],
          media: { thumbnail: url },
          pricing: money(SINGLE_REG_INR, SINGLE_SALE_INR, SINGLE_REG_USD, SINGLE_SALE_USD),
          ...meta({
            badge: "Images",
            sales: 30 + index * 11,
            revenueInr: SINGLE_SALE_INR * (10 + index),
            trending: def.trending && isHero,
            featured: def.featured && isHero,
          }),
          offer: {
            enabled: true,
            label: "LIMITED INTRO PRICE",
          },
          campaign: {
            enabled: true,
            label: "LIMITED INTRO PRICE",
            headline: isHero
              ? "One image. Endless ways to make it yours."
              : `From ${def.name}`,
            supportingText: "",
            ctaText: "Get this image",
            microMessages: [],
          },
          access: "Instant access",
          resolution: "2048x2048",
          format: "PNG",
          aiImageData: collectionAiImageData(def, [url], `${slug}-single`, {
            introTimerDays: 20,
            introTimerExtensionHours: 4,
          }),
          relationships: isHero
            ? [
                {
                  id: `rel-${id}-to-pack`,
                  relatedProductId: def.packProductId,
                  relationshipType: "RELATED",
                  sortOrder: 0,
                },
                ...(def.heroProductId === "prod-image-001"
                  ? [
                      {
                        id: "rel-cute-prompt",
                        relatedProductId: "prod-prompt-001",
                        relationshipType: "ADD_ON" as const,
                        sortOrder: 1,
                        customPriceInr: 249,
                      },
                      {
                        id: "rel-cute-content",
                        relatedProductId: "prod-content-001",
                        relationshipType: "ADD_ON" as const,
                        sortOrder: 2,
                        customPriceInr: 249,
                      },
                    ]
                  : []),
              ]
            : [
                {
                  id: `rel-${id}-to-pack`,
                  relatedProductId: def.packProductId,
                  relationshipType: "RELATED",
                  sortOrder: 0,
                },
              ],
          createdAt: "2026-08-10T08:00:00.000Z",
        }),
      );
    });
  }

  return products;
}

export function getCollectionById(id: string) {
  return IMAGE_COLLECTIONS.find((c) => c.id === id);
}

export function getCollectionByProductId(productId: string) {
  return IMAGE_COLLECTIONS.find(
    (c) =>
      c.heroProductId === productId ||
      c.singleProductIds.includes(productId) ||
      c.packProductId === productId,
  );
}
