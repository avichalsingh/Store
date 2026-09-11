/**
 * Central product-type registry for the RHYTHM marketplace.
 * Add new types here — avoid scattering productType if/else across the app.
 */

export const PRODUCT_TYPES = [
  "VIDEO",
  "AI_IMAGE",
  "PROMPT",
  "CAPTION_PACK",
  "BUNDLE",
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_RELATIONSHIP_TYPES = [
  "ADD_ON",
  "RELATED",
  "RECOMMENDED",
  "INCLUDED_IN_BUNDLE",
] as const;

export type ProductRelationshipType =
  (typeof PRODUCT_RELATIONSHIP_TYPES)[number];

export type ProductTypeConfig = {
  id: ProductType;
  label: string;
  singular: string;
  plural: string;
  description: string;
  href: string;
  pdpBase: string;
  icon: "video" | "image" | "prompt" | "caption" | "bundle";
  usesVideoMedia: boolean;
  usesCharacter: boolean;
  supportsAddOns: boolean;
};

export const PRODUCT_TYPE_CONFIG: Record<ProductType, ProductTypeConfig> = {
  VIDEO: {
    id: "VIDEO",
    label: "Video",
    singular: "Video",
    plural: "Videos",
    description: "Dance / motion video with master + watermarked preview",
    href: "/videos",
    pdpBase: "/videos",
    icon: "video",
    usesVideoMedia: true,
    usesCharacter: true,
    supportsAddOns: true,
  },
  AI_IMAGE: {
    id: "AI_IMAGE",
    label: "AI Image",
    singular: "AI Image",
    plural: "AI Images",
    description: "Standalone AI artwork and character stills",
    href: "/images",
    pdpBase: "/images",
    icon: "image",
    usesVideoMedia: false,
    usesCharacter: false,
    supportsAddOns: true,
  },
  PROMPT: {
    id: "PROMPT",
    label: "Prompt",
    singular: "Prompt",
    plural: "Prompts",
    description: "Protected generation prompts sold independently",
    href: "/prompts",
    pdpBase: "/prompts",
    icon: "prompt",
    usesVideoMedia: false,
    usesCharacter: false,
    supportsAddOns: false,
  },
  CAPTION_PACK: {
    id: "CAPTION_PACK",
    label: "Caption Pack",
    singular: "Caption Pack",
    plural: "Caption Packs",
    description: "Caption + matching hashtag items for social posts",
    href: "/captions",
    pdpBase: "/captions",
    icon: "caption",
    usesVideoMedia: false,
    usesCharacter: false,
    supportsAddOns: false,
  },
  BUNDLE: {
    id: "BUNDLE",
    label: "Bundle",
    singular: "Bundle",
    plural: "Bundles",
    description: "Curated multi-product packs with savings",
    href: "/bundles",
    pdpBase: "/bundles",
    icon: "bundle",
    usesVideoMedia: false,
    usesCharacter: false,
    supportsAddOns: false,
  },
};

export function isProductType(value: unknown): value is ProductType {
  return (
    typeof value === "string" &&
    (PRODUCT_TYPES as readonly string[]).includes(value)
  );
}

export function getProductTypeConfig(type: ProductType): ProductTypeConfig {
  return PRODUCT_TYPE_CONFIG[type];
}

export function productPdpHref(type: ProductType, slug: string): string {
  return `${PRODUCT_TYPE_CONFIG[type].pdpBase}/${slug}`;
}

export function productBrowseHref(type: ProductType): string {
  return PRODUCT_TYPE_CONFIG[type].href;
}

/** Default hashtags per caption item. */
export const HASHTAGS_PER_SET = 5;

/** Caption packs shown on /captions. */
export const CAPTION_STOREFRONT_TYPES = ["CAPTION_PACK"] as const;
