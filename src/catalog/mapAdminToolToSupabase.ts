import { normalizeTool } from "@/admin/lib/normalizeTool";
import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import {
  DEFAULT_TOOLS_SETTINGS,
  isToolCategoryId,
  TOOL_STATUSES,
} from "@/catalog/tools/types";

export type AiToolsTableRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  status: "draft" | "active" | "inactive";
  featured: boolean;
  recommended: boolean;
  editors_pick: boolean;
  sort_order: number;
  logo_url: string | null;
  cover_image_url: string | null;
  affiliate_url: string | null;
  official_url: string;
  pricing: Record<string, unknown>;
  deal: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateAdminToolForPublish(
  raw: unknown,
): { ok: true; tool: AiTool } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Tool payload is required" };
  }
  const input = raw as Partial<AiTool>;
  if (!asTrimmed(input.id)) {
    return { ok: false, error: "Tool id is required" };
  }
  const tool = normalizeTool({ ...input, id: asTrimmed(input.id) });
  if (!tool.name.trim()) {
    return { ok: false, error: "Tool name is required" };
  }
  if (!tool.slug.trim()) {
    return { ok: false, error: "Tool slug is required" };
  }
  if (!tool.officialUrl.trim()) {
    return { ok: false, error: "Official website URL is required" };
  }
  if (!(TOOL_STATUSES as readonly string[]).includes(tool.status)) {
    return { ok: false, error: "Invalid tool status" };
  }
  if (!isToolCategoryId(tool.primaryCategory)) {
    return { ok: false, error: "Invalid tool category" };
  }
  return { ok: true, tool };
}

/**
 * Map CMS tool → ai_tools row.
 * Deal (offer) is stored separately from affiliate_url so deal edits never
 * require touching outbound affiliate links.
 */
export function adminToolToAiToolsRow(tool: AiTool): AiToolsTableRow {
  const now = new Date().toISOString();
  return {
    id: tool.id,
    slug: tool.slug.trim(),
    name: tool.name.trim(),
    tagline: tool.shortDescription.trim(),
    description: tool.fullDescription.trim() || tool.shortDescription.trim(),
    category: tool.primaryCategory,
    status: tool.status,
    featured: Boolean(tool.featured),
    recommended: Boolean(tool.recommended),
    editors_pick: Boolean(tool.editorsPick),
    sort_order: tool.sortOrder,
    logo_url: tool.logoUrl?.trim() || null,
    cover_image_url: tool.coverImageUrl?.trim() || null,
    affiliate_url: tool.affiliateUrl?.trim() || null,
    official_url: tool.officialUrl.trim(),
    // Public-safe pricing only — admin notes live in metadata (not catalog view).
    pricing: {
      pricingType: tool.pricing.pricingType,
      currency: tool.pricing.currency,
      regularPrice: tool.pricing.regularPrice,
      currentPrice: tool.pricing.currentPrice,
      billingPeriod: tool.pricing.billingPeriod,
      freeTrialAvailable: tool.pricing.freeTrialAvailable,
      freeTrialDetails: tool.pricing.freeTrialDetails,
      origin: tool.pricing.origin ?? "manual",
    },
    deal: {
      saleActive: Boolean(tool.offer.saleActive),
      saleTitle: tool.offer.saleTitle,
      regularPrice: tool.offer.regularPrice,
      salePrice: tool.offer.salePrice,
      discountPercent: tool.offer.discountPercent,
      saleStartDate: tool.offer.saleStartDate,
      saleEndDate: tool.offer.saleEndDate,
      offerDescription: tool.offer.offerDescription,
      offerCtaText: tool.offer.offerCtaText,
      couponCode: tool.offer.couponCode,
      currency: tool.pricing.currency,
      origin: tool.offer.origin ?? "manual",
    },
    metadata: {
      galleryUrls: tool.galleryUrls,
      categories: tool.categories,
      tags: tool.tags,
      bestFor: tool.bestFor,
      features: tool.features,
      dataOrigin: tool.dataOrigin,
      pricingNotes: tool.pricing.pricingNotes,
      // monitoring intentionally not required for launch; omit from public view
    },
    created_at: tool.createdAt || now,
    updated_at: tool.updatedAt || now,
  };
}

type CatalogToolRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  status: string;
  featured: boolean | null;
  recommended: boolean | null;
  editors_pick: boolean | null;
  sort_order: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  affiliate_url: string | null;
  official_url: string | null;
  pricing: Record<string, unknown> | null;
  deal: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

/** Map public catalog_ai_tools rows → storefront AiTool (no admin metadata). */
export function mapCatalogToolRows(rows: CatalogToolRow[]): AiTool[] {
  return rows.map((row) => {
    const pricing = (row.pricing ?? {}) as Record<string, unknown>;
    const deal = (row.deal ?? {}) as Record<string, unknown>;
    const category = isToolCategoryId(row.category) ? row.category : "OTHER";
    // Preserve stored deal fields; storefront must use isToolOfferLive for UI.
    return normalizeTool({
      id: row.id,
      name: row.name,
      slug: row.slug,
      officialUrl: row.official_url ?? "",
      affiliateUrl: row.affiliate_url ?? undefined,
      logoUrl: row.logo_url ?? undefined,
      coverImageUrl: row.cover_image_url ?? undefined,
      galleryUrls: [],
      shortDescription: row.tagline ?? "",
      fullDescription: row.description ?? "",
      primaryCategory: category,
      categories: [category],
      tags: [],
      bestFor: "",
      features: [],
      status: row.status === "active" ? "active" : "draft",
      featured: Boolean(row.featured),
      recommended: Boolean(row.recommended),
      editorsPick: Boolean(row.editors_pick),
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
      pricing: {
        pricingType: (pricing.pricingType as AiTool["pricing"]["pricingType"]) ?? "freemium",
        currency: (pricing.currency as AiTool["pricing"]["currency"]) ?? "USD",
        regularPrice:
          typeof pricing.regularPrice === "number"
            ? pricing.regularPrice
            : undefined,
        currentPrice:
          typeof pricing.currentPrice === "number"
            ? pricing.currentPrice
            : undefined,
        billingPeriod:
          (pricing.billingPeriod as AiTool["pricing"]["billingPeriod"]) ??
          "month",
        freeTrialAvailable: Boolean(pricing.freeTrialAvailable),
        freeTrialDetails:
          typeof pricing.freeTrialDetails === "string"
            ? pricing.freeTrialDetails
            : undefined,
        // Never expose admin pricing notes on the public API.
        pricingNotes: undefined,
        origin: "manual",
      },
      offer: {
        saleActive: Boolean(deal.saleActive),
        saleTitle:
          typeof deal.saleTitle === "string" ? deal.saleTitle : undefined,
        regularPrice:
          typeof deal.regularPrice === "number" ? deal.regularPrice : undefined,
        salePrice:
          typeof deal.salePrice === "number" ? deal.salePrice : undefined,
        discountPercent:
          typeof deal.discountPercent === "number"
            ? deal.discountPercent
            : undefined,
        saleStartDate:
          typeof deal.saleStartDate === "string"
            ? deal.saleStartDate
            : undefined,
        saleEndDate:
          typeof deal.saleEndDate === "string" ? deal.saleEndDate : undefined,
        offerDescription:
          typeof deal.offerDescription === "string"
            ? deal.offerDescription
            : undefined,
        offerCtaText:
          typeof deal.offerCtaText === "string"
            ? deal.offerCtaText
            : undefined,
        couponCode:
          typeof deal.couponCode === "string" ? deal.couponCode : undefined,
        origin: "manual",
      },
      dataOrigin: "manual",
      createdAt: row.created_at ?? new Date().toISOString(),
      updatedAt: row.updated_at ?? new Date().toISOString(),
    });
  });
}

export function normalizePublishedToolsSettings(
  raw: unknown,
): ToolsSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_TOOLS_SETTINGS };
  }
  const input = raw as Partial<ToolsSettings>;
  return {
    ...DEFAULT_TOOLS_SETTINGS,
    ...input,
    homepageDealToolIds: Array.isArray(input.homepageDealToolIds)
      ? input.homepageDealToolIds.filter(
          (id): id is string => typeof id === "string" && Boolean(id.trim()),
        )
      : DEFAULT_TOOLS_SETTINGS.homepageDealToolIds,
  };
}
