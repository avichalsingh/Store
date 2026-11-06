import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blankTool } from "@/admin/lib/normalizeTool";
import {
  adminToolToAiToolsRow,
  mapCatalogToolRows,
  validateAdminToolForPublish,
} from "@/catalog/mapAdminToolToSupabase";
import { isToolOfferLive } from "@/catalog/tools/homepageDeals";

describe("launch AI tools mapping", () => {
  it("validates and maps deal independently of affiliate URL", () => {
    const tool = blankTool({
      id: "tool-1",
      name: "Demo Tool",
      slug: "demo-tool",
      officialUrl: "https://example.com",
      affiliateUrl: "https://example.com/aff?ref=pragvi",
      shortDescription: "Short",
      status: "active",
      offer: {
        saleActive: true,
        saleTitle: "Spring sale",
        regularPrice: 20,
        salePrice: 10,
        discountPercent: 50,
        couponCode: "SAVE50",
        saleEndDate: "2099-01-01T00:00:00.000Z",
        origin: "manual",
      },
    });

    const validated = validateAdminToolForPublish(tool);
    assert.equal(validated.ok, true);
    if (!validated.ok) return;

    const row = adminToolToAiToolsRow(validated.tool);
    assert.equal(row.affiliate_url, "https://example.com/aff?ref=pragvi");
    assert.equal((row.deal as { couponCode?: string }).couponCode, "SAVE50");
    assert.equal((row.deal as { salePrice?: number }).salePrice, 10);

    // Changing deal must not require affiliate mutation
    const dealOnly = adminToolToAiToolsRow({
      ...validated.tool,
      offer: {
        ...validated.tool.offer,
        salePrice: 8,
        couponCode: "SAVE60",
      },
    });
    assert.equal(dealOnly.affiliate_url, row.affiliate_url);
    assert.equal((dealOnly.deal as { salePrice?: number }).salePrice, 8);
  });

  it("public mapper never invents monitoring and marks expired deals inactive", () => {
    const live = mapCatalogToolRows([
      {
        id: "t1",
        slug: "live",
        name: "Live",
        tagline: "t",
        description: "d",
        category: "AI_IMAGE",
        status: "active",
        featured: false,
        recommended: false,
        editors_pick: false,
        sort_order: 1,
        logo_url: null,
        cover_image_url: null,
        affiliate_url: "https://x.test/a",
        official_url: "https://x.test",
        pricing: { currency: "USD", pricingType: "paid" },
        deal: {
          saleActive: true,
          saleEndDate: "2099-12-31T00:00:00.000Z",
          salePrice: 9,
        },
      },
    ]);
    assert.equal(live[0]?.monitoring.enabled, false);
    assert.equal(isToolOfferLive(live[0]!), true);

    const expired = mapCatalogToolRows([
      {
        id: "t2",
        slug: "expired",
        name: "Expired",
        tagline: "t",
        description: "d",
        category: "OTHER",
        status: "active",
        featured: false,
        recommended: false,
        editors_pick: false,
        sort_order: 2,
        logo_url: null,
        cover_image_url: null,
        affiliate_url: null,
        official_url: "https://y.test",
        pricing: {},
        deal: {
          saleActive: true,
          saleEndDate: "2020-01-01T00:00:00.000Z",
        },
      },
    ]);
    assert.equal(isToolOfferLive(expired[0]!), false);
  });

  it("rejects incomplete publish payloads", () => {
    const bad = validateAdminToolForPublish({
      id: "x",
      name: "",
      slug: "x",
      officialUrl: "",
    });
    assert.equal(bad.ok, false);
  });

  it("keeps pricingNotes in metadata only — not public pricing or API map", () => {
    const tool = blankTool({
      id: "tool-notes",
      name: "Notes Tool",
      slug: "notes-tool",
      officialUrl: "https://example.com",
      status: "active",
      pricing: {
        pricingType: "paid",
        currency: "USD",
        pricingNotes: "Internal verification: ignore demo scrape",
        freeTrialAvailable: false,
        origin: "manual",
      },
    });
    const row = adminToolToAiToolsRow(tool);
    assert.equal(
      (row.pricing as { pricingNotes?: string }).pricingNotes,
      undefined,
    );
    assert.equal(
      (row.metadata as { pricingNotes?: string }).pricingNotes,
      "Internal verification: ignore demo scrape",
    );

    const publicTools = mapCatalogToolRows([
      {
        id: row.id,
        slug: row.slug,
        name: row.name,
        tagline: row.tagline,
        description: row.description,
        category: row.category,
        status: row.status,
        featured: false,
        recommended: false,
        editors_pick: false,
        sort_order: 0,
        logo_url: null,
        cover_image_url: null,
        affiliate_url: null,
        official_url: row.official_url,
        // Legacy rows may still have notes in pricing jsonb — strip on read.
        pricing: {
          ...row.pricing,
          pricingNotes: "leaked note",
        },
        deal: {},
      },
    ]);
    assert.equal(publicTools[0]?.pricing.pricingNotes, undefined);
  });

  it("treats not-yet-started and expired offers as not live", () => {
    const future = blankTool({
      id: "future",
      name: "Future",
      slug: "future",
      officialUrl: "https://x.test",
      status: "active",
      offer: {
        saleActive: true,
        saleStartDate: "2099-01-01T00:00:00.000Z",
        couponCode: "SOON",
        origin: "manual",
      },
    });
    const expired = blankTool({
      id: "past",
      name: "Past",
      slug: "past",
      officialUrl: "https://x.test",
      status: "active",
      offer: {
        saleActive: true,
        saleEndDate: "2020-01-01T00:00:00.000Z",
        couponCode: "OLD",
        origin: "manual",
      },
    });
    assert.equal(isToolOfferLive(future), false);
    assert.equal(isToolOfferLive(expired), false);
  });
});
