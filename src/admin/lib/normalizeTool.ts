import {
  DEFAULT_TOOLS_SETTINGS,
  isToolCategoryId,
  type AiTool,
  type ToolPendingChange,
  type ToolPriceHistoryEntry,
  type ToolsSettings,
} from "@/catalog/tools/types";

export function blankTool(partial?: Partial<AiTool> & { id?: string }): AiTool {
  const now = new Date().toISOString();
  return normalizeTool({
    id: partial?.id ?? `tool-${Math.random().toString(36).slice(2, 9)}`,
    name: "",
    slug: "",
    officialUrl: "",
    galleryUrls: [],
    shortDescription: "",
    fullDescription: "",
    primaryCategory: "OTHER",
    categories: ["OTHER"],
    tags: [],
    bestFor: "",
    features: [],
    status: "draft",
    featured: false,
    recommended: false,
    editorsPick: false,
    sortOrder: 0,
    pricing: {
      pricingType: "freemium",
      currency: "USD",
      freeTrialAvailable: false,
      origin: "manual",
    },
    offer: { saleActive: false, origin: "manual" },
    monitoring: {
      enabled: false,
      frequency: "daily",
      automationMode: "MANUAL_REVIEW",
      status: "not_monitored",
      liveMonitoringAvailable: false,
    },
    dataOrigin: "manual",
    createdAt: now,
    updatedAt: now,
    ...partial,
  });
}

export function normalizeTool(raw: Partial<AiTool> & { id: string }): AiTool {
  const primary = isToolCategoryId(raw.primaryCategory)
    ? raw.primaryCategory
    : "OTHER";
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter(isToolCategoryId)
    : [primary];
  if (!categories.includes(primary)) categories.unshift(primary);

  return {
    id: raw.id,
    name: raw.name ?? "",
    slug: raw.slug ?? "",
    officialUrl: raw.officialUrl ?? "",
    affiliateUrl: raw.affiliateUrl || undefined,
    logoUrl: raw.logoUrl || undefined,
    coverImageUrl: raw.coverImageUrl || undefined,
    galleryUrls: Array.isArray(raw.galleryUrls) ? raw.galleryUrls.filter(Boolean) : [],
    shortDescription: raw.shortDescription ?? "",
    fullDescription: raw.fullDescription ?? "",
    primaryCategory: primary,
    categories: categories.length ? categories : [primary],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    bestFor: raw.bestFor ?? "",
    features: Array.isArray(raw.features) ? raw.features : [],
    status: raw.status ?? "draft",
    featured: Boolean(raw.featured),
    recommended: Boolean(raw.recommended),
    editorsPick: Boolean(raw.editorsPick),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : 0,
    pricing: {
      pricingType: raw.pricing?.pricingType ?? "freemium",
      currency: raw.pricing?.currency ?? "USD",
      regularPrice: raw.pricing?.regularPrice,
      currentPrice: raw.pricing?.currentPrice,
      billingPeriod: raw.pricing?.billingPeriod ?? "month",
      freeTrialAvailable: Boolean(raw.pricing?.freeTrialAvailable),
      freeTrialDetails: raw.pricing?.freeTrialDetails,
      pricingNotes: raw.pricing?.pricingNotes,
      origin: raw.pricing?.origin ?? raw.dataOrigin ?? "manual",
    },
    offer: {
      saleActive: Boolean(raw.offer?.saleActive),
      saleTitle: raw.offer?.saleTitle,
      regularPrice: raw.offer?.regularPrice,
      salePrice: raw.offer?.salePrice,
      discountPercent: raw.offer?.discountPercent,
      saleStartDate: raw.offer?.saleStartDate,
      saleEndDate: raw.offer?.saleEndDate,
      offerDescription: raw.offer?.offerDescription,
      offerCtaText: raw.offer?.offerCtaText,
      origin: raw.offer?.origin ?? raw.dataOrigin ?? "manual",
    },
    monitoring: {
      enabled: Boolean(raw.monitoring?.enabled),
      sourceUrl: raw.monitoring?.sourceUrl,
      frequency: raw.monitoring?.frequency ?? "daily",
      automationMode: raw.monitoring?.automationMode ?? "MANUAL_REVIEW",
      lastCheckedAt: raw.monitoring?.lastCheckedAt,
      lastVerifiedAt: raw.monitoring?.lastVerifiedAt,
      status: raw.monitoring?.enabled
        ? (raw.monitoring?.status ?? "up_to_date")
        : "not_monitored",
      previousDetectedPrice: raw.monitoring?.previousDetectedPrice,
      currentDetectedPrice: raw.monitoring?.currentDetectedPrice,
      confidence: raw.monitoring?.confidence,
      lastError: raw.monitoring?.lastError,
      liveMonitoringAvailable: false,
    },
    dataOrigin: raw.dataOrigin ?? "manual",
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export function normalizeTools(tools: Partial<AiTool>[]): AiTool[] {
  return tools
    .filter((t): t is Partial<AiTool> & { id: string } => Boolean(t?.id))
    .map(normalizeTool);
}

export function normalizeToolsSettings(
  raw?: Partial<ToolsSettings> | null,
): ToolsSettings {
  return { ...DEFAULT_TOOLS_SETTINGS, ...(raw ?? {}) };
}

export function normalizePendingChanges(
  raw: unknown,
): ToolPendingChange[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is ToolPendingChange =>
      Boolean(c && typeof c === "object" && "id" in c && "toolId" in c),
  );
}

export function normalizePriceHistory(
  raw: unknown,
): ToolPriceHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is ToolPriceHistoryEntry =>
      Boolean(c && typeof c === "object" && "id" in c && "toolId" in c),
  );
}
