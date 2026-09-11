import type { ProductType } from "@/catalog/productTypes";
import type {
  AiImageData,
  BundleData,
  CaptionPackData,
  CaptionPackItem,
  HashtagPackData,
  ProductRelationship,
  PromptData,
} from "@/catalog/productPayloads";

export type AdminProductStatus = "draft" | "active" | "archived";
export type DataSourceMode = "demo" | "manual" | "verified";
export type ActivityLevel = "low" | "normal" | "high";
export type PerformanceStatus =
  | "normal"
  | "high-engagement"
  | "trending"
  | "viral";
export type CampaignStatus = "draft" | "scheduled" | "active" | "ended";
export type OfferStatus = "active" | "upcoming" | "expired";
export type OrderPaymentStatus = "paid" | "pending" | "refunded";
export type OrderFulfillmentStatus =
  | "completed"
  | "processing"
  | "cancelled";
export type HomepageSectionId =
  | "hero"
  | "featured"
  | "trending"
  | "collections"
  | "creator-insight"
  | "promo"
  | "footer";

export type MarketPrice = {
  regularPrice: number;
  currentPrice: number;
};

export type AdminProductPricing = {
  INR: MarketPrice;
  USD: MarketPrice;
};

export type AdminOfferConfig = {
  enabled: boolean;
  label: string;
  startDate?: string;
  endDate?: string;
};

export type AdminPerformanceMetrics = {
  mode: DataSourceMode;
  plays: string;
  playsNumeric: number;
  likes: string;
  likesNumeric: number;
  shares: string;
  sharesNumeric: number;
  engagementPct: number;
  status: PerformanceStatus;
  badge: string;
  insight: string;
  /** PDP metric unit label, e.g. "PLAYS". */
  metricLabel?: string;
  /** Optional freeform engagement line; if empty, PDP derives from likes/shares. */
  engagementText?: string;
  /** Supporting line under the insight. */
  supportingText?: string;
  /** Right-side momentum label near the graph. */
  momentumLabel?: string;
};

export type AdminCreatorActivity = {
  mode: DataSourceMode;
  addedThisWeek: number;
  saved: number;
  last24h: number;
  activityLevel: ActivityLevel;
  note: string;
};

export type AdminPdpValueCard = {
  badge: string;
  title: string;
  description: string;
};

/** Supporting copy for the compact PDP file/delivery row (mains reuse resolution/format/access). */
export type AdminFileDetails = {
  dimensionsSupporting?: string;
  formatSupporting?: string;
  accessSupporting?: string;
  usageMain?: string;
  usageSupporting?: string;
};

export type AdminLicense = {
  id: string;
  name: string;
  description: string;
  priceAdjustment: number;
};

export type AdminAvailability = {
  mode: "unlimited" | "limited";
  maxAvailable?: number;
  remaining?: number;
};

export type AdminProductMedia = {
  thumbnail: string;
  previewVideo?: string;
  downloadFileName?: string;
  downloadFileSize?: string;
};

export type MediaProcessingStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "ready"
  | "failed";

export type PreviewQuality = "standard" | "optimized" | "high";
export type WatermarkStyle = "diagonal" | "center" | "corner" | "custom";
export type WatermarkSize = "small" | "medium" | "large";
export type WatermarkMovement =
  | "static"
  | "subtle"
  | "dynamic"
  | "continuous-diagonal";
export type ThumbnailSource = "frame" | "custom";

export type WatermarkConfig = {
  enabled: boolean;
  style: WatermarkStyle;
  opacity: number; // 0-100
  size: WatermarkSize;
  movement: WatermarkMovement;
  imageUrl?: string; // PNG/WebP
  imageName?: string;
};

export type MediaMasterFile = {
  url: string; // mock / protected path
  fileName: string;
  sizeBytes: number;
  sizeLabel: string;
  resolution: string;
  duration: string;
  durationSeconds: number;
  access: "protected"; // download not public
};

export type MediaPreviewFile = {
  url: string; // public preview (derivative only — never master)
  status: MediaProcessingStatus;
  resolution: string;
  quality: PreviewQuality;
  watermarkApplied: boolean;
  access: "public";
  /** Actual generated preview blob size */
  sizeBytes?: number;
  sizeLabel?: string;
};

export type MediaThumbnail = {
  url: string;
  source: ThumbnailSource;
  timestamp: number; // seconds
  timestampLabel: string; // 00:08.4
};

export type MediaProcessingSteps = {
  uploadComplete: boolean;
  previewGenerating: boolean;
  previewReady: boolean;
  watermarkApplying: boolean;
  watermarkReady: boolean;
  thumbnailExtracting: boolean;
  thumbnailReady: boolean;
};

/**
 * Media kind — what the uploaded source is.
 * Master vs Preview are file versions on the same asset, NOT asset types.
 */
export type MediaAssetType = "video" | "image";

/** Normalize legacy `master-video` / `master-image` values from older CMS state. */
export function normalizeMediaAssetType(
  type: string | undefined | null,
): MediaAssetType {
  if (type === "image" || type === "master-image") return "image";
  return "video";
}

export type MediaAsset = {
  id: string;
  name: string;
  originalFileName: string;
  /** `video` or `image` — never "master"/"preview" (those are file versions). */
  type: MediaAssetType;
  /** Untouched original upload. Full quality, no watermark, protected. */
  master: MediaMasterFile;
  /** Auto-generated derivative — optimized + watermark. Customer/storefront only. */
  preview: MediaPreviewFile;
  /** Clean poster from master frames (or custom image). Never watermarked. */
  thumbnail: MediaThumbnail;
  processingStatus: MediaProcessingStatus;
  processingSteps: MediaProcessingSteps;
  processingError?: string;
  watermarkMode: "global" | "custom";
  watermarkConfig?: Partial<WatermarkConfig>; // override when custom
  previewQuality: PreviewQuality;
  usedByProductIds: string[];
  /**
   * True when the original File/Blob is stored in IndexedDB.
   * Runtime object URLs are never persisted — they are rebuilt on hydrate.
   */
  hasLocalBlob?: boolean;
  /**
   * How preview playback resolves until a real generated preview exists.
   * - generated: separate preview blob/URL
   * - original-fallback: play persisted original in admin only (legacy)
   * - none: no playable preview yet
   */
  previewPlayback?: "generated" | "original-fallback" | "none";
  /** True when quality/watermark settings changed since last encode */
  previewStale?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GlobalMediaSettings = {
  watermark: WatermarkConfig;
  defaultPreviewQuality: PreviewQuality;
  previewResolution: string; // "540x960"
};

export type AdminProductCampaign = {
  enabled: boolean;
  label: string;
  headline: string;
  supportingText: string;
  ctaText: string;
  microMessages: string[];
};

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  /** Discriminator — defaults to VIDEO for legacy records. */
  productType: ProductType;
  /** Optional for non-video types (AI images, packs, etc.). */
  characterId?: string;
  characterName?: string;
  category: string;
  collectionIds: string[];
  shortDescription: string;
  description: string;
  tags: string[];
  status: AdminProductStatus;
  isTrending: boolean;
  isFeatured: boolean;
  mediaAssetId?: string;
  media: AdminProductMedia;
  thumbnailMode?: "frame" | "custom";
  watermarkMode?: "global" | "custom";
  watermarkOverride?: Partial<WatermarkConfig>;
  previewQuality?: PreviewQuality;
  pricing: AdminProductPricing;
  offer: AdminOfferConfig;
  performance: AdminPerformanceMetrics;
  creatorActivity: AdminCreatorActivity;
  campaign: AdminProductCampaign;
  availability: AdminAvailability;
  /** Video-specific (kept flat for backward compatibility). */
  duration: string;
  resolution: string;
  format: string;
  access: string;
  licenses: AdminLicense[];
  /**
   * PDP “Everything you need…” value cards (typically 3).
   * Optional — storefront falls back to defaults when empty.
   */
  pdpValueCards?: AdminPdpValueCard[];
  /** Supporting copy for the 4-up file/delivery detail row. */
  fileDetails?: AdminFileDetails;
  sales: number;
  revenueInr: number;
  /** Cross-product relationships (add-ons, related, recommended, bundle includes). */
  relationships: ProductRelationship[];
  promptData?: PromptData;
  /** @deprecated Migrated to captionPackData on load. */
  contentPackData?: { items: CaptionPackItem[] };
  captionPackData?: CaptionPackData;
  hashtagPackData?: HashtagPackData;
  aiImageData?: AiImageData;
  bundleData?: BundleData;
  createdAt: string;
  updatedAt: string;
};

export type AdminCharacterStatus =
  | "draft"
  | "active"
  | "hidden"
  | "archived";

export type AdminCharacter = {
  id: string;
  name: string;
  slug: string;
  image: string;
  shortBio: string;
  description: string;
  accentColor: string;
  status: AdminCharacterStatus;
  featured: boolean;
  showOnCharactersPage: boolean;
  pageHeadline?: string;
  pageIntro?: string;
  featuredProductId?: string;
  featuredCollectionId?: string;
  showProductsOnPage?: boolean;
  showCollectionsOnPage?: boolean;
  /** Derived counts — keep updated on save/load */
  productCount: number;
  collectionCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CollectionCoverMode = "auto" | "single" | "collage" | "custom";
export type CollectionAutoCoverSource = "first" | "popular" | "random";
export type CollectionSortMode =
  | "custom"
  | "newest"
  | "popular"
  | "engagement"
  | "price-asc"
  | "price-desc";
export type CollectionCollageLayout =
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

export type CollectionCoverSlot = {
  slotIndex: number;
  productId?: string;
};

export type CollectionCharacterRule = {
  characterId: string;
  includeExistingProducts: boolean;
  automaticallyIncludeFutureProducts: boolean;
};

export type AdminCollectionPricing = AdminProductPricing;

export type AdminCollectionOffer = AdminOfferConfig;

export type AdminCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Legacy adapter path — keep in sync from cover builder for list cards */
  coverImage: string;
  coverMode: CollectionCoverMode;
  coverMediaId?: string;
  coverAutoSource?: CollectionAutoCoverSource;
  coverProductId?: string; // single mode
  coverLayout?: CollectionCollageLayout;
  coverSlots?: CollectionCoverSlot[];
  coverCustomUrl?: string;
  productIds: string[];
  characterRules?: CollectionCharacterRule[];
  sortMode: CollectionSortMode;
  pricing?: AdminCollectionPricing;
  offer?: AdminCollectionOffer;
  status: "active" | "draft";
  featured: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminCampaign = {
  id: string;
  name: string;
  type: string;
  badge: string;
  accent: string;
  headline: string;
  description: string;
  ctaText: string;
  productIds: string[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
};

export type AdminOffer = {
  id: string;
  productId: string;
  productName: string;
  currency: "INR" | "USD";
  regularPrice: number;
  currentPrice: number;
  discountPct: number;
  startDate: string;
  endDate: string;
  status: OfferStatus;
};

export type AdminOrderItem = {
  productId: string;
  title: string;
  thumbnail: string;
  price: number;
  currency: "INR" | "USD";
};

export type AdminOrder = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: AdminOrderItem[];
  amount: number;
  currency: "INR" | "USD";
  paymentStatus: OrderPaymentStatus;
  orderStatus: OrderFulfillmentStatus;
  createdAt: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  country: string;
  orders: number;
  totalSpent: number;
  currency: "INR" | "USD";
  lastPurchase: string;
  createdAt: string;
};

export type HomepageSection = {
  id: HomepageSectionId;
  label: string;
  enabled: boolean;
  order: number;
};

export type HomepageHeroConfig = {
  eyebrow: string;
  headline: string;
  supportingText: string;
  featuredProductId: string;
  ctaText: string;
  ctaHref: string;
};

export type Announcement = {
  id: string;
  message: string;
  enabled: boolean;
  order: number;
};

export type AdminNotification = {
  id: string;
  title: string;
  body: string;
  type: "order" | "offer" | "system" | "success";
  read: boolean;
  createdAt: string;
};

export type AnalyticsPoint = {
  label: string;
  revenue: number;
  orders: number;
};

export type AnalyticsSnapshot = {
  revenue: number;
  revenueChange: number;
  orders: number;
  ordersChange: number;
  productsSold: number;
  productsSoldChange: number;
  averageOrder: number;
  averageOrderChange: number;
  series: AnalyticsPoint[];
  topProducts: Array<{
    productId: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
};
