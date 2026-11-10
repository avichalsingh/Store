/**
 * Public catalogue publication-safety regression tests.
 * Run: npx tsx --test src/catalog/__tests__/publicCatalogPublication.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterPublicCatalogProducts,
  isPublicCatalogPublishable,
  publicCatalogExclusionReason,
} from "@/catalog/publicCatalogPublication";
import {
  assembleStorefrontCatalogFromProducts,
  buildStorefrontCatalog,
} from "@/catalog/mapAdminToStorefront";
import { mapCatalogViewsToProducts } from "@/catalog/mapSupabaseProduct";
import type { AdminProduct } from "@/admin/types";
import type { CatalogProduct, VideoProduct } from "@/types";

function videoFixture(
  overrides: Partial<VideoProduct> & Pick<VideoProduct, "id" | "slug" | "title">,
): VideoProduct {
  return {
    productType: "VIDEO",
    description: "Customer-ready clip",
    price: 12,
    category: "dance",
    tags: ["trending"],
    thumbnail: "/media/videos/pulse-drop.jpg",
    duration: "0:15",
    resolution: "1080x1920",
    isTrending: false,
    isNew: false,
    collectionIds: [],
    createdAt: "2026-01-01",
    format: "MP4",
    ...overrides,
  };
}

describe("isPublicCatalogPublishable", () => {
  it("allows active customer products", () => {
    assert.equal(
      isPublicCatalogPublishable({
        id: "vid-001",
        slug: "pulse-drop",
        status: "active",
        tags: ["trending"],
      }),
      true,
    );
  });

  it("rejects draft and archived by status", () => {
    assert.equal(
      isPublicCatalogPublishable({
        id: "vid-001",
        slug: "pulse-drop",
        status: "draft",
        tags: [],
      }),
      false,
    );
    assert.equal(
      isPublicCatalogPublishable({
        id: "vid-001",
        slug: "pulse-drop",
        status: "archived",
        tags: [],
      }),
      false,
    );
  });

  it("rejects explicit integration-test / internal tags", () => {
    assert.equal(
      isPublicCatalogPublishable({
        id: "vid-phase4-integration",
        slug: "phase4-integration-test-video",
        status: "active",
        tags: ["phase4", "integration-test"],
      }),
      false,
    );
    assert.equal(
      publicCatalogExclusionReason({
        id: "vid-phase4-integration",
        tags: ["integration-test"],
        status: "active",
      }),
      "tag:integration-test",
    );
  });

  it("rejects documented dummy seed fixture ids/slugs", () => {
    assert.equal(
      isPublicCatalogPublishable({
        id: "dummy-video-01",
        slug: "dummy-midnight-footwork",
        status: "active",
        tags: ["hip-hop"],
      }),
      false,
    );
    assert.equal(
      isPublicCatalogPublishable({
        id: "prod-ok",
        slug: "dummy-lookalike-title-only",
        status: "active",
        tags: [],
      }),
      false,
    );
  });

  it("does not reject unusual titles when id/slug/tags are clean", () => {
    assert.equal(
      isPublicCatalogPublishable({
        id: "vid-weird",
        slug: "quantum-banana-loop",
        status: "active",
        tags: ["experimental"],
      }),
      true,
    );
  });
});

describe("public listing / PDP / collections / search surfaces", () => {
  const customer = videoFixture({
    id: "vid-001",
    slug: "pulse-drop",
    title: "Pulse Drop",
  });
  const integrationTest = videoFixture({
    id: "vid-phase4-integration",
    slug: "phase4-integration-test-video",
    title: "Phase4 Integration Test Video",
    tags: ["phase4", "integration-test"],
  });
  const dummySeed = videoFixture({
    id: "dummy-video-01",
    slug: "dummy-midnight-footwork",
    title: "Midnight Footwork",
    tags: ["hip-hop"],
  });

  it("filters public listing arrays", () => {
    const listed = filterPublicCatalogProducts([
      customer,
      integrationTest,
      dummySeed,
    ]);
    assert.deepEqual(
      listed.map((p) => p.id),
      ["vid-001"],
    );
  });

  it("assembleStorefrontCatalogFromProducts hides excluded from PDP getters and search pool", () => {
    const catalog = assembleStorefrontCatalogFromProducts(
      [customer, integrationTest, dummySeed],
      [
        {
          id: "col-1",
          name: "Test Collection",
          slug: "test-collection",
          description: "mix",
          status: "active",
          productIds: [
            "vid-001",
            "vid-phase4-integration",
            "dummy-video-01",
          ],
          coverMode: "auto",
          featured: false,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        } as never,
      ],
      [],
    );

    assert.equal(catalog.products.length, 1);
    assert.equal(catalog.getProductBySlug("pulse-drop")?.id, "vid-001");
    assert.equal(
      catalog.getProductBySlug("phase4-integration-test-video"),
      undefined,
    );
    assert.equal(
      catalog.getVideoBySlug("dummy-midnight-footwork"),
      undefined,
    );
    assert.equal(catalog.getProductById("vid-phase4-integration"), undefined);

    // Search-style filter over public videos only
    const q = "footwork";
    const searchHits = catalog.videos.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.tags.some((t) => t.includes(q)),
    );
    assert.equal(searchHits.length, 0);

    const collection = catalog.getCollectionBySlug("test-collection");
    assert.ok(collection);
    assert.deepEqual(collection!.videoIds, ["vid-001"]);
  });

  it("mapCatalogViewsToProducts drops draft and integration-test rows", () => {
    const mapped = mapCatalogViewsToProducts(
      [
        {
          id: "vid-001",
          name: "Pulse Drop",
          slug: "pulse-drop",
          product_type: "VIDEO",
          character_id: null,
          character_name: null,
          category: "dance",
          collection_ids: [],
          short_description: "",
          description: "ok",
          tags: ["trending"],
          status: "active",
          is_trending: false,
          is_featured: false,
          media_asset_id: null,
          media: { thumbnail: "/media/videos/pulse-drop.jpg" },
          thumbnail_mode: null,
          watermark_mode: null,
          preview_quality: null,
          pricing: {
            INR: { regularPrice: 799, currentPrice: 799 },
            USD: { regularPrice: 12, currentPrice: 12 },
          },
          offer: null,
          performance: null,
          creator_activity: null,
          campaign: null,
          availability: null,
          duration: "0:15",
          resolution: "1080x1920",
          format: "MP4",
          access: null,
          licenses: null,
          pdp_value_cards: null,
          file_details: null,
          sales: 0,
          prompt_data: null,
          caption_pack_data: null,
          ai_image_data: null,
          bundle_data: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "vid-phase4-integration",
          name: "Phase4 Integration Test Video",
          slug: "phase4-integration-test-video",
          product_type: "VIDEO",
          character_id: null,
          character_name: null,
          category: "dance",
          collection_ids: [],
          short_description: "",
          description: "internal",
          tags: ["integration-test"],
          status: "active",
          is_trending: false,
          is_featured: false,
          media_asset_id: null,
          media: { thumbnail: "/media/videos/pulse-drop.jpg" },
          thumbnail_mode: null,
          watermark_mode: null,
          preview_quality: null,
          pricing: {
            INR: { regularPrice: 799, currentPrice: 799 },
            USD: { regularPrice: 12, currentPrice: 12 },
          },
          offer: null,
          performance: null,
          creator_activity: null,
          campaign: null,
          availability: null,
          duration: "0:15",
          resolution: "1080x1920",
          format: "MP4",
          access: null,
          licenses: null,
          pdp_value_cards: null,
          file_details: null,
          sales: 0,
          prompt_data: null,
          caption_pack_data: null,
          ai_image_data: null,
          bundle_data: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        {
          id: "dummy-video-01",
          name: "Midnight Footwork",
          slug: "dummy-midnight-footwork",
          product_type: "VIDEO",
          character_id: null,
          character_name: null,
          category: "dance",
          collection_ids: [],
          short_description: "",
          description: "seed",
          tags: ["hip-hop"],
          status: "active",
          is_trending: false,
          is_featured: false,
          media_asset_id: null,
          media: { thumbnail: "/media/videos/pulse-drop.jpg" },
          thumbnail_mode: null,
          watermark_mode: null,
          preview_quality: null,
          pricing: {
            INR: { regularPrice: 799, currentPrice: 799 },
            USD: { regularPrice: 12, currentPrice: 12 },
          },
          offer: null,
          performance: null,
          creator_activity: null,
          campaign: null,
          availability: null,
          duration: "0:15",
          resolution: "1080x1920",
          format: "MP4",
          access: null,
          licenses: null,
          pdp_value_cards: null,
          file_details: null,
          sales: 0,
          prompt_data: null,
          caption_pack_data: null,
          ai_image_data: null,
          bundle_data: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      [],
    );

    assert.deepEqual(
      mapped.map((p) => p.id),
      ["vid-001"],
    );
  });

  it("buildStorefrontCatalog CMS path excludes non-active and tagged fixtures", () => {
    const products = [
      {
        id: "vid-001",
        name: "Pulse Drop",
        slug: "pulse-drop",
        productType: "VIDEO",
        status: "active",
        tags: ["trending"],
        category: "dance",
        collectionIds: [],
        shortDescription: "",
        description: "ok",
        media: { thumbnail: "/media/videos/pulse-drop.jpg" },
        pricing: {
          INR: { regularPrice: 799, currentPrice: 799 },
          USD: { regularPrice: 12, currentPrice: 12 },
        },
        offer: { enabled: false, label: "" },
        performance: {
          mode: "demo",
          plays: "",
          playsNumeric: 0,
          likes: "",
          likesNumeric: 0,
          shares: "",
          sharesNumeric: 0,
          engagementPct: 0,
          status: "normal",
          badge: "",
          insight: "",
        },
        creatorActivity: {
          mode: "demo",
          addedThisWeek: 0,
          saved: 0,
          last24h: 0,
          activityLevel: "normal",
          note: "",
        },
        campaign: {
          enabled: false,
          label: "",
          headline: "",
          supportingText: "",
          ctaText: "",
          microMessages: [],
        },
        availability: { mode: "unlimited" },
        duration: "0:15",
        resolution: "1080x1920",
        format: "MP4",
        access: "Instant access",
        licenses: [],
        sales: 0,
        revenueInr: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "vid-draft",
        name: "Draft Only",
        slug: "draft-only",
        productType: "VIDEO",
        status: "draft",
        tags: [],
        category: "dance",
        collectionIds: [],
        shortDescription: "",
        description: "draft",
        media: { thumbnail: "/media/videos/pulse-drop.jpg" },
        pricing: {
          INR: { regularPrice: 799, currentPrice: 799 },
          USD: { regularPrice: 12, currentPrice: 12 },
        },
        offer: { enabled: false, label: "" },
        performance: {
          mode: "demo",
          plays: "",
          playsNumeric: 0,
          likes: "",
          likesNumeric: 0,
          shares: "",
          sharesNumeric: 0,
          engagementPct: 0,
          status: "normal",
          badge: "",
          insight: "",
        },
        creatorActivity: {
          mode: "demo",
          addedThisWeek: 0,
          saved: 0,
          last24h: 0,
          activityLevel: "normal",
          note: "",
        },
        campaign: {
          enabled: false,
          label: "",
          headline: "",
          supportingText: "",
          ctaText: "",
          microMessages: [],
        },
        availability: { mode: "unlimited" },
        duration: "0:15",
        resolution: "1080x1920",
        format: "MP4",
        access: "Instant access",
        licenses: [],
        sales: 0,
        revenueInr: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ] as unknown as AdminProduct[];

    const catalog = buildStorefrontCatalog(products, [], [], []);
    assert.ok(catalog.getProductBySlug("pulse-drop"));
    assert.equal(catalog.getProductBySlug("draft-only"), undefined);
    // Static seed may fill other ids; ensure draft never appears.
    assert.equal(
      catalog.products.some((p) => p.id === "vid-draft"),
      false,
    );
  });
});
