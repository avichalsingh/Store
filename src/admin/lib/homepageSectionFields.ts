import type { HomepageSectionId } from "@/admin/types";
import { FEATURED_MERCHANDISING_SECTION_IDS } from "@/catalog/homepageConfig";

export type HomepageCopyField =
  | "eyebrow"
  | "title"
  | "description"
  | "ctaLabel"
  | "ctaHref"
  | "secondaryCtaLabel"
  | "secondaryCtaHref";

export type HomepageContentSlot =
  | "productIds"
  | "collectionIds"
  | "tickerEntries";

/** Which CMS controls apply to each live homepage section. */
export const HOMEPAGE_SECTION_FIELDS: Record<
  HomepageSectionId,
  {
    copy: HomepageCopyField[];
    content: HomepageContentSlot[];
    /** Product-type filter hint for curated product pickers. */
    productTypeHint?:
      | "VIDEO"
      | "AI_IMAGE"
      | "BUNDLE"
      | "PROMPT"
      | "ANY";
    /** Admin helper: featured merchandising ≠ trending carousel. */
    featuredMerchandising?: boolean;
  }
> = {
  hero: {
    // Hero copy lives primarily in homepageHero; section only toggles/order.
    copy: [],
    content: [],
  },
  trending: {
    copy: ["eyebrow", "title", "description"],
    content: ["productIds"],
    productTypeHint: "VIDEO",
  },
  "trending-strip": {
    copy: ["eyebrow"],
    content: ["tickerEntries"],
  },
  "featured-videos": {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: ["productIds"],
    productTypeHint: "VIDEO",
    featuredMerchandising: true,
  },
  images: {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: ["productIds"],
    productTypeHint: "AI_IMAGE",
    featuredMerchandising: true,
  },
  collections: {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: ["collectionIds"],
  },
  bundles: {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: ["productIds"],
    productTypeHint: "BUNDLE",
    featuredMerchandising: true,
  },
  "ai-tools": {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    // Schema-compat only in KYC: storefront renders null; no Tools catalog.
    content: [],
  },
  prompts: {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: ["productIds"],
    productTypeHint: "PROMPT",
    featuredMerchandising: true,
  },
  "why-pragvi": {
    copy: ["eyebrow", "title", "description", "ctaLabel", "ctaHref"],
    content: [],
  },
  "final-cta": {
    copy: [
      "eyebrow",
      "title",
      "description",
      "ctaLabel",
      "ctaHref",
      "secondaryCtaLabel",
      "secondaryCtaHref",
    ],
    content: [],
  },
};

export function isFeaturedMerchandisingSection(id: HomepageSectionId): boolean {
  return (FEATURED_MERCHANDISING_SECTION_IDS as readonly string[]).includes(id);
}

export const COPY_FIELD_LABELS: Record<HomepageCopyField, string> = {
  eyebrow: "Eyebrow",
  title: "Heading",
  description: "Supporting description",
  ctaLabel: "CTA label",
  ctaHref: "CTA destination",
  secondaryCtaLabel: "Secondary CTA label",
  secondaryCtaHref: "Secondary CTA destination",
};

/** Add-button copy for section lineup pickers (matches public catalog kind). */
export function lineupAddLabel(id: HomepageSectionId): string {
  switch (id) {
    case "trending":
      return "Add trending videos";
    case "featured-videos":
      return "Add featured videos";
    case "images":
      return "Add AI images";
    case "collections":
      return "Add collections";
    case "bundles":
      return "Add bundles";
    case "prompts":
      return "Add prompts";
    default:
      return "Add items";
  }
}
