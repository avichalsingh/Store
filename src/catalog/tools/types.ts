/**
 * AI Tools / Affiliate Tools — central types & category registry.
 * Separate from Shop products (Videos, Images, Prompts, etc.).
 */

export const TOOL_CATEGORIES = [
  "AI_IMAGE",
  "AI_VIDEO",
  "AI_MUSIC",
  "AI_VOICE",
  "AI_EDITING",
  "AI_UPSCALING",
  "AI_PRODUCTIVITY",
  "OTHER",
] as const;

export type ToolCategoryId = (typeof TOOL_CATEGORIES)[number];

export const TOOL_CATEGORY_CONFIG: Record<
  ToolCategoryId,
  { id: ToolCategoryId; label: string; description: string }
> = {
  AI_IMAGE: {
    id: "AI_IMAGE",
    label: "AI Image",
    description: "Image generation and character art tools",
  },
  AI_VIDEO: {
    id: "AI_VIDEO",
    label: "AI Video",
    description: "Video generation and motion tools",
  },
  AI_MUSIC: {
    id: "AI_MUSIC",
    label: "AI Music",
    description: "Music and soundtrack generators",
  },
  AI_VOICE: {
    id: "AI_VOICE",
    label: "AI Voice",
    description: "Voice cloning and narration tools",
  },
  AI_EDITING: {
    id: "AI_EDITING",
    label: "AI Editing",
    description: "Editing, captions, and post-production",
  },
  AI_UPSCALING: {
    id: "AI_UPSCALING",
    label: "AI Upscaling",
    description: "Enhance and upscale media quality",
  },
  AI_PRODUCTIVITY: {
    id: "AI_PRODUCTIVITY",
    label: "AI Productivity",
    description: "Workflow and creator productivity tools",
  },
  OTHER: {
    id: "OTHER",
    label: "Other",
    description: "Other useful creator tools",
  },
};

export const TOOL_PRICING_TYPES = [
  "free",
  "freemium",
  "paid",
  "enterprise",
] as const;
export type ToolPricingType = (typeof TOOL_PRICING_TYPES)[number];

export const TOOL_STATUSES = ["draft", "active", "inactive"] as const;
export type ToolStatus = (typeof TOOL_STATUSES)[number];

export const TOOL_DATA_ORIGINS = [
  "manual",
  "imported",
  "detected",
  "verified",
  "demo",
] as const;
export type ToolDataOrigin = (typeof TOOL_DATA_ORIGINS)[number];

export const TOOL_MONITOR_FREQUENCIES = [
  "6h",
  "12h",
  "daily",
  "weekly",
] as const;
export type ToolMonitorFrequency = (typeof TOOL_MONITOR_FREQUENCIES)[number];

export const TOOL_AUTOMATION_MODES = [
  "MANUAL_REVIEW",
  "AUTO_UPDATE_VERIFIED",
  "FULL_SALE_AUTOMATION",
] as const;
export type ToolAutomationMode = (typeof TOOL_AUTOMATION_MODES)[number];

export const TOOL_MONITOR_STATUSES = [
  "up_to_date",
  "change_detected",
  "sale_detected",
  "needs_review",
  "check_failed",
  "not_monitored",
  "demo_simulated",
] as const;
export type ToolMonitorStatus = (typeof TOOL_MONITOR_STATUSES)[number];

export type ToolPricing = {
  pricingType: ToolPricingType;
  currency: "USD" | "INR" | "EUR";
  regularPrice?: number;
  currentPrice?: number;
  billingPeriod?: "month" | "year" | "one_time" | "usage" | "unknown";
  freeTrialAvailable: boolean;
  freeTrialDetails?: string;
  pricingNotes?: string;
  origin: ToolDataOrigin;
};

export type ToolOffer = {
  saleActive: boolean;
  saleTitle?: string;
  regularPrice?: number;
  salePrice?: number;
  discountPercent?: number;
  saleStartDate?: string;
  saleEndDate?: string;
  offerDescription?: string;
  offerCtaText?: string;
  origin: ToolDataOrigin;
};

export type ToolMonitoring = {
  enabled: boolean;
  sourceUrl?: string;
  frequency: ToolMonitorFrequency;
  automationMode: ToolAutomationMode;
  lastCheckedAt?: string;
  lastVerifiedAt?: string;
  status: ToolMonitorStatus;
  previousDetectedPrice?: number;
  currentDetectedPrice?: number;
  confidence?: number;
  lastError?: string;
  liveMonitoringAvailable: boolean;
};

export type ToolPriceHistoryEntry = {
  id: string;
  toolId: string;
  detectedAt: string;
  previousValue?: string;
  newValue?: string;
  changeType:
    | "price_decrease"
    | "price_increase"
    | "sale_started"
    | "sale_ended"
    | "note"
    | "check_failed";
  sourceUrl?: string;
  confidence?: number;
  applied: boolean;
  appliedBy: "auto" | "manual" | "none";
  origin: ToolDataOrigin;
};

export type ToolPendingChange = {
  id: string;
  toolId: string;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
  summary: string;
  previousSnapshot: Partial<{
    regularPrice: number;
    currentPrice: number;
    saleActive: boolean;
    salePrice: number;
    discountPercent: number;
    saleEndDate: string;
    pricingNotes: string;
  }>;
  detectedSnapshot: Partial<{
    regularPrice: number;
    currentPrice: number;
    saleActive: boolean;
    salePrice: number;
    discountPercent: number;
    saleEndDate: string;
    saleTitle: string;
    pricingNotes: string;
  }>;
  sourceUrl?: string;
  confidence: number;
  changeKind: "price" | "sale" | "unclear";
};

export type AffiliateClick = {
  id: string;
  toolId: string;
  toolName: string;
  clickedAt: string;
  source:
    | "tools_browse"
    | "tool_detail"
    | "homepage_deals"
    | "search"
    | "other";
  destinationUrl: string;
};

export type AiTool = {
  id: string;
  name: string;
  slug: string;
  officialUrl: string;
  affiliateUrl?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  galleryUrls: string[];
  shortDescription: string;
  fullDescription: string;
  primaryCategory: ToolCategoryId;
  categories: ToolCategoryId[];
  tags: string[];
  bestFor: string;
  features: string[];
  status: ToolStatus;
  featured: boolean;
  recommended: boolean;
  editorsPick: boolean;
  sortOrder: number;
  pricing: ToolPricing;
  offer: ToolOffer;
  monitoring: ToolMonitoring;
  dataOrigin: ToolDataOrigin;
  createdAt: string;
  updatedAt: string;
};

export type ToolsSettings = {
  affiliateDisclosureEnabled: boolean;
  affiliateDisclosureText: string;
  homepageDealsEnabled: boolean;
  homepageMinDiscountPercent: number;
  homepageMaxDeals: number;
  homepagePreferFeatured: boolean;
  homepageOnlyVerifiedDeals: boolean;
  homepageAutoPromote: boolean;
};

export const DEFAULT_TOOLS_SETTINGS: ToolsSettings = {
  affiliateDisclosureEnabled: true,
  affiliateDisclosureText:
    "Some links may be affiliate links. RHYTHM may earn a commission at no additional cost to you.",
  homepageDealsEnabled: true,
  homepageMinDiscountPercent: 20,
  homepageMaxDeals: 3,
  homepagePreferFeatured: true,
  homepageOnlyVerifiedDeals: true,
  homepageAutoPromote: false,
};

export function isToolCategoryId(value: unknown): value is ToolCategoryId {
  return (
    typeof value === "string" &&
    (TOOL_CATEGORIES as readonly string[]).includes(value)
  );
}

export function toolOutboundUrl(
  tool: Pick<AiTool, "affiliateUrl" | "officialUrl">,
): string {
  const affiliate = tool.affiliateUrl?.trim();
  if (affiliate) return affiliate;
  return tool.officialUrl;
}

export function toolDiscountPercent(tool: AiTool): number | undefined {
  if (tool.offer.saleActive && tool.offer.discountPercent != null) {
    return tool.offer.discountPercent;
  }
  const reg = tool.pricing.regularPrice;
  const cur = tool.pricing.currentPrice;
  if (reg != null && cur != null && reg > cur && reg > 0) {
    return Math.round(((reg - cur) / reg) * 100);
  }
  return undefined;
}
