import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPublishablePerformanceMode,
  mergePublicPerformance,
  PUBLIC_MERCHANDISING_METRICS_ENABLED,
  publicCreatorActivity,
  publicPerformance,
} from "@/catalog/publicPerformance";
import { adminProductToVideo } from "@/catalog/mapAdminToStorefront";
import { videos as staticVideos } from "@/data/videos";
import { collections as staticCollections } from "@/data/collections";
import {
  DEFAULT_SECTION_COPY,
  DEFAULT_TICKER_ENTRIES,
} from "@/catalog/homepageConfig";
import type { AdminProduct } from "@/admin/types";
import type { ProductPerformance } from "@/types";

function demoPerf(
  overrides: Partial<ProductPerformance> = {},
): ProductPerformance {
  return {
    type: "trending",
    primaryMetric: "3.3M",
    primaryNumeric: 3_300_000,
    primaryLabel: "PLAYS",
    secondaryMetrics: [
      { label: "Likes", value: "218K", numeric: 218_000 },
      { label: "Shares", value: "42K", numeric: 42_000 },
    ],
    insight: "demo",
    badge: "TRENDING",
    mode: "demo",
    ...overrides,
  };
}

describe("publicPerformance gates", () => {
  it("only manual and verified modes are publishable", () => {
    assert.equal(isPublishablePerformanceMode("demo"), false);
    assert.equal(isPublishablePerformanceMode(undefined), false);
    assert.equal(isPublishablePerformanceMode("manual"), true);
    assert.equal(isPublishablePerformanceMode("verified"), true);
  });

  it("KYC storefront keeps all merchandising metrics suppressed", () => {
    assert.equal(PUBLIC_MERCHANDISING_METRICS_ENABLED, false);
    assert.equal(publicPerformance(demoPerf()), undefined);
    assert.equal(
      publicPerformance(demoPerf({ mode: "verified", primaryMetric: "12.4K" })),
      undefined,
    );
    assert.equal(
      publicPerformance(demoPerf({ mode: "manual", primaryMetric: "880K" })),
      undefined,
    );
    assert.equal(
      publicCreatorActivity({
        mode: "verified",
        addedThisWeek: 2,
        saved: 1,
        last24h: 1,
        activityLevel: "steady",
        note: "live",
      }),
      undefined,
    );
  });

  it("mergePublicPerformance never falls back to demo on storefront path", () => {
    const cms = demoPerf({ mode: "demo", primaryMetric: "1M" });
    const seed = demoPerf({ mode: "demo", primaryMetric: "9M" });
    assert.equal(
      mergePublicPerformance(cms, seed, { allowDemoFallback: false }),
      undefined,
    );
    // Even CMS manual/verified rows are suppressed while the public flag is off.
    const verified = demoPerf({ mode: "manual", primaryMetric: "880K" });
    assert.equal(
      mergePublicPerformance(verified, seed, { allowDemoFallback: false }),
      undefined,
    );
  });
});

describe("storefront mapping suppresses seed social proof", () => {
  it("adminProductToVideo drops demo CMS metrics and seed enrichVideo proof", () => {
    const product = {
      id: "vid-test-demo",
      name: "Demo Drop",
      slug: "demo-drop",
      productType: "VIDEO",
      status: "active",
      category: "Hip Hop",
      tags: [],
      shortDescription: "x",
      description: "x",
      characterId: "char-x",
      characterName: "X",
      collectionIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      isTrending: true,
      isFeatured: false,
      media: { thumbnail: "/media/videos/pulse-drop.jpg" },
      pricing: {
        INR: { regularPrice: 999, currentPrice: 799 },
        USD: { regularPrice: 12, currentPrice: 9 },
      },
      offer: { enabled: false, label: "" },
      performance: {
        mode: "demo",
        plays: "3.3M",
        playsNumeric: 3_300_000,
        likes: "218K",
        likesNumeric: 218_000,
        shares: "42K",
        sharesNumeric: 42_000,
        engagementPct: 12,
        status: "trending",
        badge: "TRENDING NOW",
        insight: "seed",
      },
      creatorActivity: {
        mode: "demo",
        addedThisWeek: 34,
        saved: 10,
        last24h: 8,
        activityLevel: "high",
        note: "seed",
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
      duration: "0:18",
      resolution: "1080x1920",
      format: "MP4",
      access: "Instant access",
      licenses: [],
      sales: 0,
      revenueInr: 0,
    } as unknown as AdminProduct;

    const mapped = adminProductToVideo(product, []);
    assert.equal(mapped.performance, undefined);
    assert.equal(mapped.activity, undefined);
    assert.equal(mapped.creatorRating, undefined);
    assert.equal(mapped.socialRotation, undefined);
    assert.equal(mapped.showCardMetrics, false);
  });

  it("static videos export has no public demo metrics", () => {
    assert.ok(staticVideos.length > 0);
    for (const video of staticVideos) {
      assert.equal(
        publicPerformance(video.performance),
        undefined,
        video.id,
      );
      assert.equal(publicCreatorActivity(video.activity), undefined, video.id);
      assert.equal(video.creatorRating, undefined, video.id);
      assert.equal(video.showCardMetrics, false, video.id);
    }
  });

  it("default homepage ticker entries ship without seed metrics", () => {
    assert.ok(DEFAULT_TICKER_ENTRIES.length > 0);
    for (const entry of DEFAULT_TICKER_ENTRIES) {
      assert.equal((entry.metric || "").trim(), "", entry.id);
    }
  });

  it("conversion trendingStripItems no longer carry demo metrics", async () => {
    const { trendingStripItems } = await import("@/data/conversion");
    for (const item of trendingStripItems) {
      assert.equal((item.metric || "").trim(), "", item.id);
    }
  });

  it("static collections export has no public demo social proof", () => {
    assert.ok(staticCollections.length > 0);
    for (const collection of staticCollections) {
      assert.equal(
        publicPerformance(collection.performance),
        undefined,
        collection.id,
      );
      assert.equal(
        publicCreatorActivity(collection.activity),
        undefined,
        collection.id,
      );
      assert.equal(collection.socialProofText, undefined, collection.id);
      assert.equal(collection.performance, undefined, collection.id);
    }
  });

  it("default homepage section copy avoids unverified popularity claims", () => {
    const trending = DEFAULT_SECTION_COPY.trending;
    const blob = `${trending.eyebrow} ${trending.title} ${trending.description}`.toLowerCase();
    assert.equal(blob.includes("best seller"), false);
    assert.equal(blob.includes("best sellers"), false);
    assert.equal(/\bpopular\b/.test(blob), false);
    assert.equal(/\bviral\b/.test(blob), false);
  });
});
