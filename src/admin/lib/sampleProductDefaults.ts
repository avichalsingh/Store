/**
 * Realistic sample defaults for newly created Admin products.
 * Used only when opening Add New Product / switching type on an unsaved draft.
 * Never writes to Supabase; never marks products active/published.
 */

import { slugify, uid } from "@/admin/lib/format";
import { normalizeAdminProduct } from "@/admin/lib/normalizeProduct";
import type { AdminProduct } from "@/admin/types";
import { DEFAULT_IMAGE_PDP_TIERS } from "@/catalog/imagePdpTypes";
import {
  emptyAiImageData,
  emptyBundleData,
  emptyCaptionPackData,
  emptyPromptData,
  type CaptionPackItem,
} from "@/catalog/productPayloads";
import {
  HASHTAGS_PER_SET,
  PRODUCT_TYPES,
  getProductTypeConfig,
  isProductType,
  type ProductType,
} from "@/catalog/productTypes";

export type SampleProductOptions = {
  /** Preserve an existing CMS id when switching type on a new draft. */
  id?: string;
  characterId?: string;
  characterName?: string;
  /** Existing slugs in CMS — used to avoid collisions. */
  existingSlugs?: readonly string[];
  /** Clock injection for deterministic tests. */
  now?: Date;
};

/** sessionStorage key for handing a switched new-product draft across editor remounts. */
export const NEW_PRODUCT_SEED_STORAGE_KEY = "pragvi.admin.newProductSeed";

export function stashNewProductSeed(product: AdminProduct): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      NEW_PRODUCT_SEED_STORAGE_KEY,
      JSON.stringify(product),
    );
  } catch {
    // Ignore quota / private-mode failures — type switch still updates local draft when possible.
  }
}

export function consumeNewProductSeed(
  expectedType?: ProductType,
): AdminProduct | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(NEW_PRODUCT_SEED_STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(NEW_PRODUCT_SEED_STORAGE_KEY);
    const parsed = JSON.parse(raw) as Partial<AdminProduct> & { id?: string };
    if (!parsed?.id || !isProductType(parsed.productType)) return null;
    if (expectedType && parsed.productType !== expectedType) return null;
    return normalizeAdminProduct(parsed as Partial<AdminProduct> & { id: string });
  } catch {
    return null;
  }
}

const SAMPLE_MEDIA_NOTE =
  "SAMPLE_PLACEHOLDER — attach a real file in Media (not uploaded yet)";

function uniqueSlug(base: string, id: string, existing: readonly string[] = []): string {
  const root = slugify(base) || "new-product";
  const suffix = id.replace(/^.*?-/, "").slice(0, 6) || "draft";
  const candidate = `${root}-${suffix}`;
  if (!existing.includes(candidate)) return candidate;
  let n = 2;
  while (existing.includes(`${candidate}-${n}`)) n += 1;
  return `${candidate}-${n}`;
}

function offerWindow(now: Date) {
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return {
    enabled: true,
    label: "Launch offer",
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

function demoPerformance(type: ProductType): AdminProduct["performance"] {
  if (type === "VIDEO") {
    return {
      mode: "demo",
      plays: "128K",
      playsNumeric: 128_000,
      likes: "9.4K",
      likesNumeric: 9400,
      shares: "2.1K",
      sharesNumeric: 2100,
      engagementPct: 8.7,
      status: "trending",
      badge: "DEMO · Rising",
      insight: "Sample engagement for CMS preview only — not storefront social proof.",
      metricLabel: "PLAYS",
      engagementText: "Demo likes + shares (editor preview)",
      supportingText: "Kept in Demo mode so public catalogue metrics stay gated.",
      momentumLabel: "Demo momentum",
    };
  }
  return {
    mode: "demo",
    plays: "—",
    playsNumeric: 0,
    likes: "1.2K",
    likesNumeric: 1200,
    shares: "340",
    sharesNumeric: 340,
    engagementPct: 6.2,
    status: "normal",
    badge: "DEMO",
    insight: "Sample CMS metrics only — Demo mode never ships as verified social proof.",
    metricLabel: type === "AI_IMAGE" ? "SAVES" : "VIEWS",
    supportingText: "Public merchandising metrics remain suppressed until verified.",
  };
}

function demoCreatorActivity(): AdminProduct["creatorActivity"] {
  return {
    mode: "demo",
    addedThisWeek: 14,
    saved: 62,
    last24h: 5,
    activityLevel: "normal",
    note: "Demo creator activity for CMS layout preview only.",
  };
}

function personalLicense(): AdminProduct["licenses"] {
  return [
    {
      id: "lic-personal",
      name: "Personal",
      description: "Personal social posts and non-commercial projects",
      priceAdjustment: 0,
    },
  ];
}

function sampleCaptionItems(): CaptionPackItem[] {
  return [
    {
      id: uid("cap"),
      label: "Hook A",
      caption:
        "When the beat drops and the room finally matches your energy — this is the clip.",
      hashtags: ["#DanceReels", "#AIVideo", "#ViralMoves", "#CreateDaily", "#PRAGVI"].slice(
        0,
        HASHTAGS_PER_SET,
      ),
    },
    {
      id: uid("cap"),
      label: "Hook B",
      caption:
        "Save this for your next late-night edit. Clean vertical motion, ready to post.",
      hashtags: ["#VerticalVideo", "#ContentCreator", "#ReelIdeas", "#MotionEdit", "#AIArt"].slice(
        0,
        HASHTAGS_PER_SET,
      ),
    },
    {
      id: uid("cap"),
      label: "Hook C",
      caption: "Soft drop → sharp footwork → hold. Built for 9:16 storytelling.",
      hashtags: ["#ShortForm", "#DanceTrend", "#EditInspo", "#CreatorTools", "#ClipReady"].slice(
        0,
        HASHTAGS_PER_SET,
      ),
    },
  ];
}

type SampleBlueprint = {
  name: string;
  category: string;
  tags: string[];
  shortDescription: string;
  description: string;
  pricing: AdminProduct["pricing"];
  duration?: string;
  resolution?: string;
  format?: string;
  access: string;
  campaign: AdminProduct["campaign"];
  pdpValueCards?: AdminProduct["pdpValueCards"];
  fileDetails?: AdminProduct["fileDetails"];
  media: AdminProduct["media"];
  isTrending?: boolean;
  isFeatured?: boolean;
  promptData?: AdminProduct["promptData"];
  captionPackData?: AdminProduct["captionPackData"];
  aiImageData?: AdminProduct["aiImageData"];
  bundleData?: AdminProduct["bundleData"];
  licenses?: AdminProduct["licenses"];
};

function blueprintFor(type: ProductType): SampleBlueprint {
  switch (type) {
    case "VIDEO":
      return {
        name: "Neon Shuffle — Vertical AI Dance Cut",
        category: "Hip Hop",
        tags: ["ai-dance", "vertical", "hip-hop", "9x16", "launch"],
        shortDescription:
          "A punchy 15-second vertical AI dance clip with clean footwork and neon city energy — ready for Reels and Shorts.",
        description:
          "Neon Shuffle is a ready-to-post AI dance video designed for vertical feeds. You get a high-resolution master for entitled download after verified payment, plus a watermarked storefront preview for browsing. Ideal for creators who need a finished motion clip without filming a set. Personal-use licence by default.",
        pricing: {
          INR: { regularPrice: 1499, currentPrice: 999 },
          USD: { regularPrice: 18.99, currentPrice: 12.99 },
        },
        duration: "0:15",
        resolution: "1080x1920",
        format: "MP4",
        access: "Digital access after verified payment",
        isTrending: true,
        isFeatured: false,
        licenses: personalLicense(),
        media: {
          thumbnail: "",
          previewVideo: "",
          downloadFileName: SAMPLE_MEDIA_NOTE,
          downloadFileSize: "— (set after master upload)",
        },
        campaign: {
          enabled: true,
          label: "New drop",
          headline: "Ship a finished vertical dance clip today",
          supportingText: "Master unlocks in Library after payment verification.",
          ctaText: "Get this clip",
          microMessages: [
            "9:16 ready",
            "Personal licence",
            "Preview is watermarked",
          ],
        },
        pdpValueCards: [
          {
            badge: "🎬",
            title: "Finished motion",
            description: "A complete vertical cut — not a raw prompt dump.",
          },
          {
            badge: "📱",
            title: "Feed-native framing",
            description: "Shot for 9:16 storytelling on Reels and Shorts.",
          },
          {
            badge: "🔓",
            title: "Master after payment",
            description: "Entitled download appears in Library once payment verifies.",
          },
        ],
        fileDetails: {
          dimensionsSupporting: "Vertical 9:16",
          formatSupporting: "H.264 MP4 master",
          accessSupporting: "Signed download after verified payment",
          usageMain: "Personal social posting",
          usageSupporting: "No commercial redistribution by default",
        },
      };
    case "AI_IMAGE":
      return {
        name: "Midnight Portrait Pack — Editorial Still",
        category: "AI Images",
        tags: ["ai-image", "portrait", "editorial", "square", "still"],
        shortDescription:
          "A polished AI portrait still with cinematic lighting — built for thumbnails, covers, and mood boards.",
        description:
          "Midnight Portrait Pack gives you a high-detail AI still with soft rim light and editorial contrast. Attach your master image files in Media before publishing. After verified payment, entitled buyers retrieve the image through Library. Personal-use licence by default; commercial rights are not included unless you add them later.",
        pricing: {
          INR: { regularPrice: 899, currentPrice: 649 },
          USD: { regularPrice: 11.99, currentPrice: 7.99 },
        },
        resolution: "1024x1024",
        format: "PNG",
        access: "Digital access after verified payment",
        licenses: personalLicense(),
        media: {
          thumbnail: "",
          downloadFileName: SAMPLE_MEDIA_NOTE,
          downloadFileSize: "— (set after image upload)",
        },
        campaign: {
          enabled: true,
          label: "Still drop",
          headline: "Editorial AI portrait, post-ready",
          supportingText: "Square crop with cinematic contrast.",
          ctaText: "Add to library",
          microMessages: ["1024² PNG", "Personal use", "Attach media before publish"],
        },
        pdpValueCards: [
          {
            badge: "🖼️",
            title: "Editorial lighting",
            description: "Rim light and contrast tuned for feed thumbnails.",
          },
          {
            badge: "📐",
            title: "Square native",
            description: "1024×1024 working resolution for versatile crops.",
          },
          {
            badge: "⬇️",
            title: "Library delivery",
            description: "Entitled access after verified payment — no parcel shipping.",
          },
        ],
        fileDetails: {
          dimensionsSupporting: "1:1 square",
          formatSupporting: "PNG still",
          accessSupporting: "In-account retrieval after verified payment",
          usageMain: "Personal creative use",
          usageSupporting: "Replace sample placeholders with your masters",
        },
        aiImageData: {
          ...emptyAiImageData(),
          images: [],
          resolution: "1024x1024",
          format: "PNG",
          fileSizeLabel: "Attach image masters in Media before publish",
          isCollectionPack: false,
          dealSettings: {
            enableFullCollection: true,
            enableAddMoreImages: true,
            collectionBadgeText: "BEST VALUE",
            massiveCollectionThreshold: 12,
          },
          pricingTiers: structuredClone(DEFAULT_IMAGE_PDP_TIERS),
          quantityUpsells: {
            plusOneInr: 299,
            plusOneUsd: 3.99,
            plusThreeInr: 699,
            plusThreeUsd: 8.99,
            plusOneCount: 1,
            plusThreeCount: 3,
          },
          introTimerDays: 3,
          introTimerExtensionHours: 12,
          introTimerMinutes: 0,
        },
      };
    case "PROMPT":
      return {
        name: "Urban Night Walk — Cinematic Prompt",
        category: "Prompts",
        tags: ["prompt", "cinematic", "urban", "night", "generator"],
        shortDescription:
          "A structured cinematic prompt for neon-lit urban walking shots — teaser-safe on the storefront, full text unlocked after purchase.",
        description:
          "Urban Night Walk is a production-minded prompt pack for image or video generators. The public teaser stays safe for browsing; the full main prompt, negatives, and settings unlock in Library after verified payment. Edit the sample prompt body to match your model stack before you publish.",
        pricing: {
          INR: { regularPrice: 599, currentPrice: 399 },
          USD: { regularPrice: 7.99, currentPrice: 4.99 },
        },
        access: "Digital access after verified payment",
        media: {
          thumbnail: "",
          downloadFileName: "",
          downloadFileSize: "",
        },
        campaign: {
          enabled: true,
          label: "Prompt drop",
          headline: "Cinematic urban night prompt, ready to adapt",
          supportingText: "Full prompt text unlocks after verified payment.",
          ctaText: "Unlock prompt",
          microMessages: ["Teaser-safe", "Negatives included", "Personal use"],
        },
        pdpValueCards: [
          {
            badge: "✍️",
            title: "Structured prompt",
            description: "Main + negative + settings sketched for fast iteration.",
          },
          {
            badge: "🔒",
            title: "Paid body private",
            description: "Full prompt stays off the public catalogue until entitled.",
          },
          {
            badge: "🎛️",
            title: "Model notes",
            description: "Sample guidance you can rewrite for your preferred model.",
          },
        ],
        promptData: {
          ...emptyPromptData(),
          publicTeaser:
            "Neon reflections on wet asphalt, slow tracking shot, cinematic night walk — full prompt unlocks after purchase.",
          canGenerate:
            "Moody urban night scenes, reflective streets, cinematic walking frames for vertical or landscape generators.",
          mainPrompt:
            "Cinematic night walk through a rainy neon city, shallow depth of field, wet asphalt reflections, soft volumetric fog, subtle film grain, tracking shot behind a lone figure in a dark coat, teal and magenta rim lights, ultra-detailed, coherent motion, 9:16 framing",
          negativePrompt:
            "blurry face, extra limbs, watermark, logo, text overlay, oversaturated, daytime, cartoon, low resolution",
          generationSettings:
            "Suggested: 9:16 or 16:9, CFG 5–7, motion strength medium, 4–6 second loop if video model",
          modelNotes:
            "Works as a base for image or short video models. Tune lens and motion tokens to your stack.",
          instructions:
            "1) Copy the main prompt into your generator. 2) Keep negatives. 3) Adjust wardrobe/city tokens. 4) Export vertical for Reels if needed.",
          sectionCount: 4,
        },
      };
    case "CAPTION_PACK":
      return {
        name: "Late Night Hooks — Caption + Hashtag Pack",
        category: "Caption Packs",
        tags: ["captions", "hashtags", "reels", "hooks", "social"],
        shortDescription:
          "Three ready-to-adapt caption hooks with matching hashtag sets for vertical dance and lifestyle clips.",
        description:
          "Late Night Hooks is a caption pack with sample hooks and hashtag rows you can rewrite before publishing. Buyers get entitled in-account access after verified payment. Keep captions punchy and hashtags relevant to the clip you pair them with.",
        pricing: {
          INR: { regularPrice: 449, currentPrice: 299 },
          USD: { regularPrice: 5.99, currentPrice: 3.99 },
        },
        access: "Digital access after verified payment",
        media: { thumbnail: "", downloadFileName: "", downloadFileSize: "" },
        campaign: {
          enabled: true,
          label: "Caption pack",
          headline: "Hooks + hashtags for vertical posts",
          supportingText: "Edit the sample lines to match your brand voice.",
          ctaText: "Get the pack",
          microMessages: ["3 hooks", "Hashtag rows", "Personal use"],
        },
        pdpValueCards: [
          {
            badge: "💬",
            title: "Hook-first copy",
            description: "Opening lines written for the first second of a Reel.",
          },
          {
            badge: "#",
            title: "Matched hashtags",
            description: "Each caption ships with a five-tag starter set.",
          },
          {
            badge: "✏️",
            title: "Fully editable",
            description: "Replace sample lines before you publish to Staging.",
          },
        ],
        captionPackData: {
          ...emptyCaptionPackData(),
          items: sampleCaptionItems(),
        },
      };
    case "BUNDLE":
      return {
        name: "Creator Starter Bundle — Clip + Still + Prompt",
        category: "Bundles",
        tags: ["bundle", "starter", "video", "image", "prompt"],
        shortDescription:
          "A sample multi-product bundle layout for a dance clip, portrait still, and cinematic prompt — add real included products before publishing.",
        description:
          "Creator Starter Bundle is a template pack you can reshape. Add existing catalogue products as included items, set bundle pricing below the sum of parts, and publish only when the set is ready. Delivery is digital after verified payment for each entitled component.",
        pricing: {
          INR: { regularPrice: 2999, currentPrice: 1999 },
          USD: { regularPrice: 36.99, currentPrice: 24.99 },
        },
        access: "Digital access after verified payment",
        isFeatured: true,
        media: {
          thumbnail: "",
          downloadFileName: "",
          downloadFileSize: "",
        },
        campaign: {
          enabled: true,
          label: "Bundle deal",
          headline: "Starter set for creators who need motion, stills, and prompts",
          supportingText: "Add included products, then tune the bundle price.",
          ctaText: "View bundle",
          microMessages: ["Multi-product", "Savings vs singles", "Edit before publish"],
        },
        pdpValueCards: [
          {
            badge: "📦",
            title: "Curated set",
            description: "Group complementary digital assets under one checkout.",
          },
          {
            badge: "💸",
            title: "Bundle pricing",
            description: "Sample discount vs buying items separately — adjust freely.",
          },
          {
            badge: "🧩",
            title: "Add real includes",
            description: "Relationship includes stay empty until you pick products.",
          },
        ],
        bundleData: {
          ...emptyBundleData(),
          includedProductIds: [],
          compareAtTotalInr: 2999,
          compareAtTotalUsd: 36.99,
          coverMode: "auto",
          coverAutoSource: "first",
          coverSlots: [],
        },
      };
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unsupported sample product type: ${_exhaustive}`);
    }
  }
}

/**
 * Build a fully populated draft AdminProduct for the given type.
 * Status is always `draft`. Performance/creatorActivity stay in `demo` mode.
 */
export function createSampleAdminProduct(
  type: ProductType = "VIDEO",
  options: SampleProductOptions = {},
): AdminProduct {
  if (!isProductType(type)) {
    throw new Error(`Invalid product type: ${String(type)}`);
  }
  const now = options.now ?? new Date();
  const prefix =
    type === "VIDEO"
      ? "vid"
      : type === "BUNDLE"
        ? "bun"
        : type === "AI_IMAGE"
          ? "img"
          : type === "CAPTION_PACK"
            ? "cap"
            : type === "PROMPT"
              ? "prm"
              : "prd";
  const id = options.id?.trim() || uid(prefix);
  const bp = blueprintFor(type);
  const slug = uniqueSlug(bp.name, id, options.existingSlugs ?? []);

  const usesCharacter = getProductTypeConfig(type).usesCharacter;

  return normalizeAdminProduct({
    id,
    name: bp.name,
    slug,
    productType: type,
    characterId: usesCharacter ? options.characterId : undefined,
    characterName: usesCharacter ? options.characterName : undefined,
    category: bp.category,
    collectionIds: [],
    shortDescription: bp.shortDescription,
    description: bp.description,
    tags: [...bp.tags],
    status: "draft",
    isTrending: Boolean(bp.isTrending),
    isFeatured: Boolean(bp.isFeatured),
    mediaAssetId: undefined,
    media: { ...bp.media },
    thumbnailMode: "custom",
    watermarkMode: "global",
    previewQuality: "standard",
    pricing: structuredClone(bp.pricing),
    offer: offerWindow(now),
    performance: demoPerformance(type),
    creatorActivity: demoCreatorActivity(),
    campaign: structuredClone(bp.campaign),
    availability: { mode: "unlimited" },
    duration: bp.duration ?? "",
    resolution: bp.resolution ?? "",
    format: bp.format ?? "",
    access: bp.access,
    licenses: bp.licenses ? structuredClone(bp.licenses) : [],
    pdpValueCards: bp.pdpValueCards
      ? structuredClone(bp.pdpValueCards)
      : undefined,
    fileDetails: bp.fileDetails ? structuredClone(bp.fileDetails) : undefined,
    sales: 0,
    revenueInr: 0,
    relationships: [],
    promptData: bp.promptData ? structuredClone(bp.promptData) : undefined,
    captionPackData: bp.captionPackData
      ? structuredClone(bp.captionPackData)
      : undefined,
    aiImageData: bp.aiImageData ? structuredClone(bp.aiImageData) : undefined,
    bundleData: bp.bundleData ? structuredClone(bp.bundleData) : undefined,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

/**
 * Switch product type on an unsaved new draft.
 * Preserves shared edits (name, slug, pricing, offer, flags, descriptions, tags)
 * when present; refreshes type-specific payloads from samples.
 */
export function switchSampleProductType(
  current: AdminProduct,
  nextType: ProductType,
  options: SampleProductOptions = {},
): AdminProduct {
  if (!isProductType(nextType)) {
    throw new Error(`Invalid product type: ${String(nextType)}`);
  }
  if (current.productType === nextType) {
    return current;
  }
  const sample = createSampleAdminProduct(nextType, {
    ...options,
    id: current.id,
    existingSlugs: (options.existingSlugs ?? []).filter((s) => s !== current.slug),
  });

  const keepName = current.name.trim().length > 0;
  const keepSlug = current.slug.trim().length > 0;
  const keepShort = current.shortDescription.trim().length > 0;
  const keepDesc = current.description.trim().length > 0;
  const keepTags = Array.isArray(current.tags) && current.tags.length > 0;

  const usesCharacter = getProductTypeConfig(nextType).usesCharacter;

  return normalizeAdminProduct({
    ...sample,
    id: current.id,
    name: keepName ? current.name : sample.name,
    slug: keepSlug ? current.slug : sample.slug,
    shortDescription: keepShort ? current.shortDescription : sample.shortDescription,
    description: keepDesc ? current.description : sample.description,
    tags: keepTags ? [...current.tags] : [...sample.tags],
    pricing: structuredClone(current.pricing),
    offer: structuredClone(current.offer),
    isTrending: current.isTrending,
    isFeatured: current.isFeatured,
    availability: structuredClone(current.availability),
    collectionIds: [...(current.collectionIds ?? [])],
    relationships: [], // type change clears cross-type relationship edges
    characterId: usesCharacter
      ? current.characterId ?? options.characterId ?? sample.characterId
      : undefined,
    characterName: usesCharacter
      ? current.characterName ?? options.characterName ?? sample.characterName
      : undefined,
    // Always demo for new-sample performance — never promote to verified via type switch
    performance: {
      ...sample.performance,
      mode: "demo",
    },
    creatorActivity: {
      ...sample.creatorActivity,
      mode: "demo",
    },
    status: "draft",
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  });
}

/** Required non-empty string fields for a usable new draft (per type). */
export function sampleProductRequiredFieldGaps(
  product: AdminProduct,
): string[] {
  const gaps: string[] = [];
  const need = (label: string, ok: boolean) => {
    if (!ok) gaps.push(label);
  };
  need("name", Boolean(product.name.trim()));
  need("slug", Boolean(product.slug.trim()));
  need("category", Boolean(product.category.trim()));
  need("shortDescription", Boolean(product.shortDescription.trim()));
  need("description", Boolean(product.description.trim()));
  need("tags", Array.isArray(product.tags) && product.tags.length > 0);
  need("pricing.INR.currentPrice", product.pricing?.INR?.currentPrice > 0);
  need("pricing.USD.currentPrice", product.pricing?.USD?.currentPrice > 0);
  need("status.draft", product.status === "draft");
  need("performance.mode.demo", product.performance?.mode === "demo");
  need("creatorActivity.mode.demo", product.creatorActivity?.mode === "demo");
  need("access", Boolean(product.access.trim()));

  switch (product.productType) {
    case "VIDEO":
      need("duration", Boolean(product.duration.trim()));
      need("resolution", Boolean(product.resolution.trim()));
      need("format", Boolean(product.format.trim()));
      break;
    case "PROMPT":
      need("promptData.mainPrompt", Boolean(product.promptData?.mainPrompt?.trim()));
      need(
        "promptData.publicTeaser",
        Boolean(product.promptData?.publicTeaser?.trim()),
      );
      break;
    case "CAPTION_PACK":
      need(
        "captionPackData.items",
        (product.captionPackData?.items?.length ?? 0) > 0,
      );
      break;
    case "AI_IMAGE":
      need("aiImageData.resolution", Boolean(product.aiImageData?.resolution?.trim()));
      need("aiImageData.format", Boolean(product.aiImageData?.format?.trim()));
      break;
    case "BUNDLE":
      need("bundleData", Boolean(product.bundleData));
      break;
    default:
      break;
  }
  return gaps;
}

export function assertAllSampleTypesPopulate(
  existingSlugs: readonly string[] = [],
): Record<ProductType, AdminProduct> {
  const out = {} as Record<ProductType, AdminProduct>;
  for (const type of PRODUCT_TYPES) {
    const product = createSampleAdminProduct(type, { existingSlugs });
    const gaps = sampleProductRequiredFieldGaps(product);
    if (gaps.length) {
      throw new Error(`${type} sample gaps: ${gaps.join(", ")}`);
    }
    out[type] = product;
  }
  return out;
}
