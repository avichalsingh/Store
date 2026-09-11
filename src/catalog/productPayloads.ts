/**
 * Type-specific product payloads + product relationships.
 * Shared conceptually by Admin CMS and storefront (admin owns the source of truth).
 */

import type { ProductRelationshipType, ProductType } from "@/catalog/productTypes";
import { HASHTAGS_PER_SET } from "@/catalog/productTypes";

export type ProductRelationship = {
  id: string;
  relatedProductId: string;
  relationshipType: ProductRelationshipType;
  sortOrder: number;
  /** Optional discounted add-on price override (INR). */
  customPriceInr?: number;
  customPriceUsd?: number;
};

/** @deprecated Migrated to CaptionPackItem.caption on load. */
export type CaptionItem = {
  id: string;
  text: string;
  label?: string;
  notes?: string;
};

export type CaptionPackItem = {
  id: string;
  caption: string;
  hashtags: string[];
  label?: string;
  notes?: string;
};

export type CaptionPackData = {
  items: CaptionPackItem[];
};

/** @deprecated Migrated into CAPTION_PACK items on load. */
export type HashtagSet = {
  id: string;
  name: string;
  description?: string;
  hashtags: string[];
};

/** @deprecated Migrated into CAPTION_PACK items on load. */
export type HashtagPackData = {
  sets: HashtagSet[];
};

export type PromptData = {
  /** Full prompt — never expose publicly before purchase. */
  mainPrompt: string;
  negativePrompt?: string;
  generationSettings?: string;
  modelNotes?: string;
  instructions?: string;
  /** Safe teaser shown on storefront before purchase. */
  publicTeaser?: string;
  /** What the prompt can generate (public). */
  canGenerate?: string;
  sectionCount?: number;
};

import type {
  ImageCollectionBundleMeta,
  ImagePdpDealSettings,
  ImagePdpPricingTier,
} from "@/catalog/imagePdpTypes";

export type AiImageFile = {
  id: string;
  mediaAssetId?: string;
  url?: string;
  fileName?: string;
  sizeLabel?: string;
  isCover?: boolean;
  previewUrl?: string;
};

export type AiImageData = {
  images: AiImageFile[];
  resolution?: string;
  format?: string;
  fileSizeLabel?: string;
  collectionId?: string;
  collectionName?: string;
  isCollectionPack?: boolean;
  dealSettings?: ImagePdpDealSettings;
  pricingTiers?: ImagePdpPricingTier[];
  collectionBundle?: ImageCollectionBundleMeta;
  quantityUpsells?: {
    plusOneInr?: number;
    plusOneUsd?: number;
    plusThreeInr?: number;
    plusThreeUsd?: number;
    plusOneCount?: number;
    plusThreeCount?: number;
    tierThreeTotalInr?: number;
    tierThreeTotalUsd?: number;
    tierFiveTotalInr?: number;
    tierFiveTotalUsd?: number;
  };
  introTimerDays?: number;
  introTimerExtensionHours?: number;
  introTimerMinutes?: number;
};

export type BundleCoverMode = "auto" | "single" | "collage" | "custom";
export type BundleAutoCoverSource = "first" | "popular" | "random";
export type BundleCollageLayout =
  | "single"
  | "two-horizontal"
  | "two-vertical"
  | "three-horizontal"
  | "three-vertical"
  | "three-large-left"
  | "three-large-right"
  | "four-grid"
  | "four-horizontal"
  | "four-vertical";

export type BundleCoverSlot = {
  slotIndex: number;
  productId?: string;
};

export type BundleData = {
  includedProductIds: string[];
  compareAtTotalInr?: number;
  compareAtTotalUsd?: number;
  coverMode?: BundleCoverMode;
  coverMediaId?: string;
  coverAutoSource?: BundleAutoCoverSource;
  coverProductId?: string;
  coverLayout?: BundleCollageLayout;
  coverSlots?: BundleCoverSlot[];
  coverCustomUrl?: string;
};

export type TypeSpecificData = {
  promptData?: PromptData;
  /** @deprecated Read-only for migration from stored CONTENT_PACK records. */
  contentPackData?: { items: CaptionPackItem[] };
  captionPackData?: CaptionPackData;
  /** @deprecated Read-only for migration from stored HASHTAG_PACK records. */
  hashtagPackData?: HashtagPackData;
  aiImageData?: AiImageData;
  bundleData?: BundleData;
};

export function emptyPromptData(): PromptData {
  return {
    mainPrompt: "",
    negativePrompt: "",
    generationSettings: "",
    modelNotes: "",
    instructions: "",
    publicTeaser: "",
    canGenerate: "",
    sectionCount: 1,
  };
}

export function emptyCaptionPackData(): CaptionPackData {
  return { items: [] };
}

export function blankCaptionPackItem(): CaptionPackItem {
  return {
    id: `item-${Date.now()}`,
    caption: "",
    hashtags: Array.from({ length: HASHTAGS_PER_SET }, () => ""),
    label: "",
  };
}

export function emptyAiImageData(): AiImageData {
  return {
    images: [],
    resolution: "1024x1024",
    format: "PNG",
    fileSizeLabel: "",
  };
}

export function emptyBundleData(): BundleData {
  return {
    includedProductIds: [],
    coverMode: "auto",
    coverAutoSource: "first",
    coverSlots: [],
  };
}

export function defaultTypeData(type: ProductType): TypeSpecificData {
  switch (type) {
    case "PROMPT":
      return { promptData: emptyPromptData() };
    case "CAPTION_PACK":
      return { captionPackData: emptyCaptionPackData() };
    case "AI_IMAGE":
      return { aiImageData: emptyAiImageData() };
    case "BUNDLE":
      return { bundleData: emptyBundleData() };
    default:
      return {};
  }
}
