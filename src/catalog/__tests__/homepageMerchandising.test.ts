import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_TICKER_ENTRIES,
  FEATURED_MERCHANDISING_SECTION_IDS,
  HOMEPAGE_SECTION_IDS,
  moveCuratedId,
  normalizeHomepageSections,
  resolveCuratedById,
  resolveFeaturedSelection,
  resolveTickerEntries,
} from "@/catalog/homepageConfig";

const catalog = [
  { id: "vid-1", slug: "pulse", title: "Pulse" },
  { id: "vid-2", slug: "neon", title: "Neon" },
  { id: "vid-3", slug: "spark", title: "Spark" },
  { id: "img-1", slug: "img-one", title: "Image One" },
];

describe("Stage 3 — featured merchandising independence", () => {
  it("keeps featured section picks independent from trending picks", () => {
    const sections = normalizeHomepageSections([
      {
        id: "trending",
        enabled: true,
        order: 0,
        label: "Trending",
        content: { productIds: ["vid-1", "vid-2"] },
      },
      {
        id: "featured-videos",
        enabled: true,
        order: 1,
        label: "Featured",
        content: { productIds: ["vid-3"] },
      },
    ]);
    const trending = sections.find((s) => s.id === "trending")!;
    const featured = sections.find((s) => s.id === "featured-videos")!;
    assert.deepEqual(trending.content?.productIds, ["vid-1", "vid-2"]);
    assert.deepEqual(featured.content?.productIds, ["vid-3"]);

    const trendingResolved = resolveCuratedById(
      catalog,
      trending.content?.productIds,
      catalog,
      8,
    );
    const featuredResolved = resolveFeaturedSelection(
      catalog,
      featured.content?.productIds,
      catalog.filter((p) => p.id.startsWith("vid")),
      8,
    );
    assert.deepEqual(
      trendingResolved.map((p) => p.id),
      ["vid-1", "vid-2"],
    );
    assert.deepEqual(
      featuredResolved.map((p) => p.id),
      ["vid-3"],
    );
  });

  it("allows the same product to be both featured and trending", () => {
    const both = resolveFeaturedSelection(
      catalog,
      ["vid-1"],
      catalog,
      4,
    );
    const trending = resolveCuratedById(catalog, ["vid-1", "vid-2"], catalog, 4);
    assert.ok(both.some((p) => p.id === "vid-1"));
    assert.ok(trending.some((p) => p.id === "vid-1"));
  });

  it("preserves curated order and skips duplicates", () => {
    const picked = resolveFeaturedSelection(
      catalog,
      ["vid-3", "vid-1", "vid-3", "vid-2"],
      catalog,
      8,
    );
    assert.deepEqual(
      picked.map((p) => p.id),
      ["vid-3", "vid-1", "vid-2"],
    );
  });

  it("ignores invalid / missing references and falls back when none resolve", () => {
    const partial = resolveFeaturedSelection(
      catalog,
      ["missing", "vid-2", "gone"],
      catalog,
      4,
    );
    assert.deepEqual(
      partial.map((p) => p.id),
      ["vid-2"],
    );

    const none = resolveFeaturedSelection(
      catalog,
      ["missing-a", "missing-b"],
      catalog.slice(0, 2),
      2,
    );
    assert.deepEqual(
      none.map((p) => p.id),
      ["vid-1", "vid-2"],
    );
  });

  it("empty featured selection uses fallback behavior", () => {
    const fallback = [{ id: "fb-1" }, { id: "fb-2" }];
    assert.deepEqual(
      resolveFeaturedSelection(catalog, [], fallback, 2).map((p) => p.id),
      ["fb-1", "fb-2"],
    );
    assert.deepEqual(
      resolveFeaturedSelection(catalog, undefined, fallback, 1).map((p) => p.id),
      ["fb-1"],
    );
  });

  it("documents featured merchandising section ids", () => {
    assert.ok(FEATURED_MERCHANDISING_SECTION_IDS.includes("featured-videos"));
    assert.ok(FEATURED_MERCHANDISING_SECTION_IDS.includes("images"));
    assert.ok(FEATURED_MERCHANDISING_SECTION_IDS.includes("prompts"));
    assert.ok(FEATURED_MERCHANDISING_SECTION_IDS.includes("bundles"));
    assert.ok(!FEATURED_MERCHANDISING_SECTION_IDS.includes("trending"));
  });

  it("moveCuratedId reorders without dropping ids", () => {
    assert.deepEqual(moveCuratedId(["a", "b", "c"], "b", -1), ["b", "a", "c"]);
    assert.deepEqual(moveCuratedId(["a", "b", "c"], "a", -1), ["a", "b", "c"]);
  });
});

describe("Stage 3 — trending ticker CMS", () => {
  it("resolves visibility content and destination links", () => {
    const items = resolveTickerEntries(
      [
        {
          id: "t1",
          label: "🔥 PULSE",
          metric: "3M",
          productId: "vid-1",
          order: 0,
          enabled: true,
        },
        {
          id: "t2",
          label: "Custom link",
          metric: "CTA",
          href: "/explore",
          order: 1,
          enabled: true,
        },
      ],
      catalog,
    );
    assert.equal(items.length, 2);
    assert.equal(items[0]?.href, "/videos/pulse");
    assert.equal(items[1]?.href, "/explore");
  });

  it("skips disabled, empty label, and invalid destinations", () => {
    const items = resolveTickerEntries(
      [
        {
          id: "off",
          label: "Hidden",
          metric: "x",
          href: "/ok",
          order: 0,
          enabled: false,
        },
        {
          id: "blank",
          label: "   ",
          metric: "x",
          href: "/ok",
          order: 1,
          enabled: true,
        },
        {
          id: "bad",
          label: "Bad",
          metric: "x",
          href: "javascript:alert(1)",
          order: 2,
          enabled: true,
        },
        {
          id: "admin-path",
          label: "Admin",
          metric: "x",
          href: "/admin",
          order: 3,
          enabled: true,
        },
        {
          id: "proto-rel",
          label: "Proto",
          metric: "x",
          href: "//evil.example",
          order: 4,
          enabled: true,
        },
        {
          id: "missing-product",
          label: "Missing",
          metric: "x",
          productId: "nope",
          order: 5,
          enabled: true,
        },
        {
          id: "ok",
          label: "OK",
          metric: "1",
          href: "https://example.com/x",
          order: 6,
          enabled: true,
        },
      ],
      catalog,
    );
    assert.deepEqual(
      items.map((i) => i.id),
      ["ok"],
    );
  });

  it("returns empty when explicit entries all fail (no seed fill)", () => {
    const items = resolveTickerEntries(
      [
        {
          id: "broken",
          label: "Broken",
          metric: "",
          productId: "missing",
          order: 0,
          enabled: true,
        },
      ],
      catalog,
    );
    assert.equal(items.length, 0);
  });

  it("normalizes ticker entries on reload and preserves order", () => {
    const normalized = normalizeHomepageSections([
      {
        id: "trending-strip",
        enabled: false,
        order: 2,
        label: "Ticker",
        content: {
          tickerEntries: [
            {
              id: "b",
              label: "Second",
              metric: "2",
              href: "/b",
              order: 5,
              enabled: true,
            },
            {
              id: "a",
              label: "First",
              metric: "1",
              href: "/a",
              order: 1,
              enabled: true,
            },
            {
              id: "a",
              label: "Dup",
              metric: "x",
              href: "/dup",
              order: 9,
              enabled: true,
            },
          ],
        },
      },
    ]);
    const strip = normalized.find((s) => s.id === "trending-strip")!;
    assert.equal(strip.enabled, false);
    const entries = strip.content?.tickerEntries ?? [];
    assert.equal(entries.length, 2);
    assert.deepEqual(
      entries.map((e) => e.id),
      ["a", "b"],
    );
    assert.equal(entries[0]?.order, 0);
    assert.equal(entries[1]?.order, 1);

    const reloaded = normalizeHomepageSections(
      JSON.parse(JSON.stringify(normalized)),
    );
    assert.deepEqual(
      reloaded.find((s) => s.id === "trending-strip")?.content?.tickerEntries,
      strip.content?.tickerEntries,
    );
  });

  it("seeds default ticker entries when missing from legacy config", () => {
    const normalized = normalizeHomepageSections([
      { id: "trending-strip", enabled: true, order: 0, label: "Ticker" },
    ]);
    const entries =
      normalized.find((s) => s.id === "trending-strip")?.content
        ?.tickerEntries ?? [];
    assert.ok(entries.length >= DEFAULT_TICKER_ENTRIES.length);
    assert.equal(entries[0]?.productId, DEFAULT_TICKER_ENTRIES[0]?.productId);
  });
});


describe("Stage 3 — Stage 2 section visibility regression smoke", () => {
  it("keeps section ordering/visibility intact after merchandising fields", () => {
    const sections = normalizeHomepageSections(
      HOMEPAGE_SECTION_IDS.map((id, order) => ({
        id,
        label: id,
        enabled: id !== "hero",
        order: id === "final-cta" ? -1 : order,
        content:
          id === "featured-videos"
            ? { productIds: ["vid-1"], collectionIds: [], maxItems: 8 }
            : undefined,
      })),
    );
    assert.equal(sections[0]?.id, "final-cta");
    assert.equal(sections.find((s) => s.id === "hero")?.enabled, false);
    assert.deepEqual(
      sections.find((s) => s.id === "featured-videos")?.content?.productIds,
      ["vid-1"],
    );
  });
});
