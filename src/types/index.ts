export type Character = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  image: string;
  accentColor: string;
  videoCount: number;
  collectionCount: number;
};

export type Region = "india" | "international";

export type RegionalPrice = {
  regularPrice: number;
  salePrice: number;
};

export type ProductPricing = {
  india: RegionalPrice;
  international: RegionalPrice;
};

export type LaunchOffer = {
  enabled: boolean;
  label: string;
  discountText: string;
  endDate?: string;
};

export type PerformancePersonality =
  | "trending"
  | "engagement-spike"
  | "share-magnet"
  | "scroll-stopper"
  | "comment-magnet"
  | "replay-friendly";

export type PerformanceSecondary = {
  label: string;
  value: string;
  numeric?: number;
};

export type ProductPerformance = {
  type: PerformancePersonality;
  primaryMetric: string;
  primaryNumeric: number;
  primaryLabel: string;
  secondaryMetrics: PerformanceSecondary[];
  insight: string;
  badge: string;
  aboveAverage?: string;
  /** Supporting line under insight on the Trending card. */
  supportingText?: string;
  /** Momentum label shown near the graph. */
  momentumLabel?: string;
  /** Optional freeform engagement line; PDP derives from likes/shares when empty. */
  engagementText?: string;
  mode: "demo";
};

export type CreatorActivity = {
  mode: "demo";
  addedThisWeek: number;
  saved: number;
  last24h: number;
  activityLevel: "high" | "rising" | "steady";
  note: string;
};

export type SocialProofRotation = {
  mode: "demo";
  messages: string[];
};

export type CreatorInsight = {
  title: string;
  description: string;
  icon: "eye" | "replay" | "share" | "chat" | "spark" | "hook";
};

export type PdpValueCard = {
  badge: string;
  title: string;
  description: string;
};

export type VideoFileDetails = {
  dimensionsMain: string;
  dimensionsSupporting: string;
  formatMain: string;
  formatSupporting: string;
  accessMain: string;
  accessSupporting: string;
  usageMain: string;
  usageSupporting: string;
};

export type VideoProduct = {
  id: string;
  title: string;
  slug: string;
  productType: "VIDEO";
  characterId?: string;
  characterName?: string;
  description: string;
  price: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  category: string;
  tags: string[];
  thumbnail: string;
  previewVideo?: string;
  duration: string;
  resolution: string;
  isTrending: boolean;
  isNew: boolean;
  isFeatured?: boolean;
  collectionIds: string[];
  createdAt: string;
  format: string;
  access?: string;
  performance?: ProductPerformance;
  activity?: CreatorActivity;
  socialRotation?: SocialProofRotation;
  creatorInsights?: CreatorInsight[];
  creatorRating?: number;
  showCardMetrics?: boolean;
  /** PDP “Everything you need…” value cards. */
  pdpValueCards?: PdpValueCard[];
  /** Compact file/delivery detail row on the Video PDP. */
  fileDetails?: VideoFileDetails;
  /** Resolved add-on / related product ids for PDP (public-safe). */
  addOnProductIds?: string[];
  /** Optional discounted add-on prices keyed by related product id. */
  addOnPriceOverrides?: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  >;
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
};

export type PromptProductPublic = {
  id: string;
  title: string;
  slug: string;
  productType: "PROMPT";
  description: string;
  /** Short outcome line for PDP hero / supporting copy. */
  shortDescription?: string;
  price: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  category: string;
  tags: string[];
  thumbnail: string;
  isTrending: boolean;
  isNew: boolean;
  isFeatured?: boolean;
  createdAt: string;
  /** Public teaser only — never full prompt. */
  publicTeaser?: string;
  canGenerate?: string;
  sectionCount?: number;
  addOnProductIds?: string[];
  addOnPriceOverrides?: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  >;
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
};

export type CaptionPackPreviewItem = {
  captionLead: string;
  visibleHashtag?: string;
  label?: string;
  hasMoreCaption: boolean;
  hasMoreHashtags: boolean;
};

export type CaptionPackProductPublic = {
  id: string;
  title: string;
  slug: string;
  productType: "CAPTION_PACK";
  /** Concise CMS short description when set. */
  shortDescription?: string;
  /** Long CMS description; falls back to short when long is empty. */
  description: string;
  price: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  category: string;
  tags: string[];
  thumbnail: string;
  isTrending: boolean;
  isNew: boolean;
  isFeatured?: boolean;
  createdAt: string;
  itemCount: number;
  styleLabels: string[];
  /** First 3 paired caption + hashtag items for public teaser. */
  previewItems: CaptionPackPreviewItem[];
  addOnProductIds?: string[];
  addOnPriceOverrides?: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  >;
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
};

export type AiImageProductPublic = {
  id: string;
  title: string;
  slug: string;
  productType: "AI_IMAGE";
  description: string;
  price: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  category: string;
  tags: string[];
  thumbnail: string;
  isTrending: boolean;
  isNew: boolean;
  isFeatured?: boolean;
  createdAt: string;
  imageCount: number;
  resolution?: string;
  format?: string;
  access?: string;
  /** Public preview URLs only. */
  previewImages: string[];
  /** PDP sales eyebrow, e.g. CONTENT-READY IMAGE PACK */
  salesEyebrow?: string;
  /** Emotional sales headline (campaign.headline). */
  salesHeadline?: string;
  /** Supporting sales line under the headline. */
  supportingCopy?: string;
  /** “Why this works” cards (reuses pdpValueCards). */
  whyCards?: PdpValueCard[];
  /** Larger pack upgrade target when this SKU is a single / subset. */
  packUpgrade?: {
    productId: string;
    title: string;
    slug: string;
    imageCount: number;
    thumbnail: string;
    previewImages?: string[];
    collectionId?: string;
    collectionName?: string;
    bundleSaleInr?: number;
    bundleSaleUsd?: number;
    bundleCompareInr?: number;
    bundleCompareUsd?: number;
    bundleBadgeText?: string;
  };
  /** Resolved collection metadata for the current image. */
  imageCollection?: {
    id: string;
    name: string;
    imageCount: number;
    previewImages: string[];
  };
  /** PDP deal visibility & copy (merged from product + global CMS defaults). */
  dealSettings?: {
    enableFullCollection: boolean;
    enableAddMoreImages: boolean;
    collectionBadgeText: string;
    massiveCollectionThreshold: number;
  };
  /** Progressive per-image pricing tiers for custom library bundles. */
  pricingTiers?: import("@/catalog/imagePdpTypes").ImagePdpPricingTier[];
  /** Optional +1 / +3 image upsell deltas (legacy CMS fields). */
  quantityUpsells?: {
    plusOneInr?: number;
    plusOneUsd?: number;
    plusThreeInr?: number;
    plusThreeUsd?: number;
    plusOneCount?: number;
    plusThreeCount?: number;
    /** Custom bundle tier totals (library-wide multi-select). */
    tierThreeTotalInr?: number;
    tierThreeTotalUsd?: number;
    tierFiveTotalInr?: number;
    tierFiveTotalUsd?: number;
  };
  /** Primary intro timer length in days when CMS offer has no endDate. */
  introTimerDays?: number;
  /** Extension window in hours after the primary timer ends. */
  introTimerExtensionHours?: number;
  /** Legacy intro timer length in minutes (fallback when days is unset). */
  introTimerMinutes?: number;
  addOnProductIds?: string[];
  addOnPriceOverrides?: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  >;
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
};

export type BundleProductPublic = {
  id: string;
  title: string;
  slug: string;
  productType: "BUNDLE";
  description: string;
  price: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  category: string;
  tags: string[];
  thumbnail: string;
  isTrending: boolean;
  isNew: boolean;
  isFeatured?: boolean;
  createdAt: string;
  includedProductIds: string[];
  includedSummaries: {
    id: string;
    title: string;
    productType: string;
    thumbnail: string;
    price: number;
  }[];
  individualTotal: number;
  savings: number;
  addOnProductIds?: string[];
  addOnPriceOverrides?: Record<
    string,
    { customPriceInr?: number; customPriceUsd?: number }
  >;
  relatedProductIds?: string[];
  recommendedProductIds?: string[];
};

export type CatalogProduct =
  | VideoProduct
  | PromptProductPublic
  | CaptionPackProductPublic
  | AiImageProductPublic
  | BundleProductPublic;

export type Collection = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImage: string;
  videoIds: string[];
  price: number;
  originalPrice: number;
  pricing?: ProductPricing;
  offer?: LaunchOffer;
  characterId?: string;
  featured?: boolean;
  performance?: ProductPerformance;
  activity?: CreatorActivity;
  socialProofText?: string;
  valueStack?: string[];
  exclusiveCount?: number;
  unreleasedCount?: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image: string;
  videoCount: number;
};

export type CartItem = {
  id: string;
  type: "video" | "collection" | "product";
  productId: string;
  productType?: string;
  title: string;
  characterName: string;
  thumbnail: string;
  quantity: number;
  /** When this line is an add-on attached to another cart line. */
  parentProductId?: string;
  /** Optional add-on price override (INR). */
  customPriceInr?: number;
};

export type PurchasedItem = {
  id: string;
  productId: string;
  title: string;
  characterName: string;
  thumbnail: string;
  purchasedAt: string;
  type: "video" | "collection" | "product";
  productType?: string;
};

export type CreatorTestimonial = {
  id: string;
  quote: string;
  handle: string;
  role: string;
  variant: "quote" | "social" | "profile";
  accent?: string;
};

export type TrendingStripItem = {
  id: string;
  videoId: string;
  label: string;
  metric: string;
};

export type PriceQuote = {
  current: number;
  regular: number;
  saleActive: boolean;
  discountPct: number;
  label?: string;
  endDate?: string;
  discountText?: string;
};
