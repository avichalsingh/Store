import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPROVED_HOMEPAGE_HERO_CTA_HREF,
  APPROVED_HOMEPAGE_HERO_CTA_TEXT,
  APPROVED_HOMEPAGE_HERO_HEADLINE,
  DEFAULT_HOMEPAGE_HERO,
  DEFAULT_HOMEPAGE_SECTIONS,
  fromHomepageConfigDocument,
  getOrderedEnabledSections,
  HOMEPAGE_SECTION_IDS,
  homepageHeroNeedsLegacyCopyMigration,
  isHomepageHeroCollageCurated,
  LEGACY_HOMEPAGE_SECTION_MAP,
  LEGACY_ORDER_MERGE_ARTIFACT,
  LEGACY_SEED_HOMEPAGE_HERO_CTA_TEXT,
  LEGACY_SEED_HOMEPAGE_HERO_HEADLINE,
  migrateLegacyHomepageHeroCopy,
  normalizeHomepageHero,
  normalizeHomepageSections,
  resolveCuratedById,
  resolveHomepageSectionId,
  resolveHomepageSectionOrder,
  sectionCopy,
  toHomepageConfigDocument,
} from "@/catalog/homepageConfig";

describe("Stage 2 homepage config", () => {
  it("default configuration includes every live homepage section", () => {
    const ids = DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.id);
    assert.deepEqual(ids, [...HOMEPAGE_SECTION_IDS]);
    // ai-tools stays in the schema for publish compat but is off without Tools.
    assert.ok(
      DEFAULT_HOMEPAGE_SECTIONS.every((s) =>
        s.id === "ai-tools" ? !s.enabled : s.enabled,
      ),
    );
    assert.equal(DEFAULT_HOMEPAGE_HERO.headline.includes("AI Content"), true);
  });

  it("maps legacy section ids without duplicating or keeping footer", () => {
    assert.equal(resolveHomepageSectionId("featured"), "featured-videos");
    assert.equal(resolveHomepageSectionId("creator-insight"), "why-pragvi");
    assert.equal(resolveHomepageSectionId("promo"), "final-cta");
    assert.equal(resolveHomepageSectionId("footer"), null);
    assert.equal(LEGACY_HOMEPAGE_SECTION_MAP.footer, null);

    const normalized = normalizeHomepageSections([
      { id: "hero", label: "Hero", enabled: true, order: 0 },
      { id: "featured", label: "Old featured", enabled: false, order: 1 },
      { id: "trending", label: "Trending", enabled: true, order: 2 },
      { id: "collections", label: "Collections", enabled: true, order: 3 },
      { id: "creator-insight", label: "Insight", enabled: false, order: 4 },
      { id: "promo", label: "Promo", enabled: true, order: 5 },
      { id: "footer", label: "Footer", enabled: true, order: 6 },
    ]);

    assert.equal(normalized.length, HOMEPAGE_SECTION_IDS.length);
    assert.equal(
      normalized.find((s) => s.id === "featured-videos")?.enabled,
      false,
    );
    assert.equal(
      normalized.find((s) => s.id === "why-pragvi")?.enabled,
      false,
    );
    assert.equal(normalized.find((s) => s.id === "final-cta")?.enabled, true);
    assert.ok(!normalized.some((s) => (s.id as string) === "footer"));
    assert.ok(normalized.some((s) => s.id === "bundles"));
    assert.ok(normalized.some((s) => s.id === "images"));
    // Partial legacy orders must not place featured-videos before trending.
    assert.deepEqual(
      normalized.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
  });

  it("fills missing copy/content fields from defaults (legacy compatibility)", () => {
    const normalized = normalizeHomepageSections([
      { id: "images", label: "Images", enabled: true, order: 0 },
    ]);
    const images = normalized.find((s) => s.id === "images");
    assert.ok(images?.copy?.title);
    assert.ok(images?.copy?.ctaHref);
    assert.deepEqual(images?.content?.productIds, []);
    // Saved order:0 on a single section must not pull images to the top.
    assert.deepEqual(
      normalized.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
    assert.equal(images?.order, HOMEPAGE_SECTION_IDS.indexOf("images"));
  });

  it("default section order is deterministic and matches canonical ids", () => {
    assert.deepEqual(
      DEFAULT_HOMEPAGE_SECTIONS.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
    assert.deepEqual(
      normalizeHomepageSections(undefined).map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
    assert.deepEqual(
      normalizeHomepageSections([]).map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
  });

  it("legacy partial orders do not rearrange newly introduced sections", () => {
    const normalized = normalizeHomepageSections([
      { id: "hero", enabled: true, order: 0, label: "Hero" },
      { id: "featured", enabled: true, order: 1, label: "Featured" },
      { id: "trending", enabled: true, order: 2, label: "Trending" },
      { id: "collections", enabled: true, order: 3, label: "Collections" },
      { id: "creator-insight", enabled: true, order: 4, label: "Insight" },
      { id: "promo", enabled: true, order: 5, label: "Promo" },
    ]);
    assert.deepEqual(
      normalized.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
    assert.ok(
      normalized.findIndex((s) => s.id === "trending") <
        normalized.findIndex((s) => s.id === "featured-videos"),
    );
  });

  it("repairs persisted legacy-merge artifact order without wiping content", () => {
    const artifact = LEGACY_ORDER_MERGE_ARTIFACT.map((id, order) => ({
      id,
      label: `L-${id}`,
      enabled: id !== "bundles",
      order,
      copy: { title: `Custom ${id}` },
      content:
        id === "featured-videos"
          ? { productIds: ["vid-custom"], collectionIds: [], maxItems: 3 }
          : undefined,
    }));
    const normalized = normalizeHomepageSections(artifact);
    assert.deepEqual(
      normalized.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS],
    );
    const featured = normalized.find((s) => s.id === "featured-videos");
    assert.equal(featured?.copy?.title, "Custom featured-videos");
    assert.deepEqual(featured?.content?.productIds, ["vid-custom"]);
    assert.equal(
      normalized.find((s) => s.id === "bundles")?.enabled,
      false,
    );
  });

  it("preserves intentional admin reorder of a complete section set", () => {
    const reordered = [...HOMEPAGE_SECTION_IDS].reverse().map((id, order) => ({
      id,
      label: id,
      enabled: true,
      order,
    }));
    const normalized = normalizeHomepageSections(reordered);
    assert.deepEqual(
      normalized.map((s) => s.id),
      [...HOMEPAGE_SECTION_IDS].reverse(),
    );
    const again = normalizeHomepageSections(
      JSON.parse(JSON.stringify(normalized)),
    );
    assert.deepEqual(
      again.map((s) => s.id),
      normalized.map((s) => s.id),
    );
  });

  it("resolveHomepageSectionOrder inserts missing ids at canonical slots", () => {
    const orderById = new Map<
      (typeof HOMEPAGE_SECTION_IDS)[number],
      number | undefined
    >([
      ["hero", 0],
      ["trending", 1],
      ["final-cta", 2],
    ]);
    assert.deepEqual(
      resolveHomepageSectionOrder(["hero", "trending", "final-cta"], orderById),
      [...HOMEPAGE_SECTION_IDS],
    );
  });

  it("respects section visibility ordering", () => {
    // Complete set — admin always persists every section id.
    const sections = normalizeHomepageSections(
      HOMEPAGE_SECTION_IDS.map((id, order) => ({
        id,
        label: id,
        enabled: id !== "trending",
        order: id === "final-cta" ? -1 : order,
      })),
    );
    const enabled = getOrderedEnabledSections(sections);
    assert.equal(enabled[0]?.id, "final-cta");
    assert.equal(enabled[1]?.id, "hero");
    assert.ok(!enabled.some((s) => s.id === "trending"));
  });

  it("preserves editable copy overrides", () => {
    const normalized = normalizeHomepageSections([
      {
        id: "collections",
        label: "Collections",
        enabled: true,
        order: 0,
        copy: {
          eyebrow: "Custom eyebrow",
          title: "Custom title",
          ctaLabel: "Go",
          ctaHref: "/custom",
        },
      },
    ]);
    const copy = sectionCopy(
      normalized.find((s) => s.id === "collections"),
      "collections",
    );
    assert.equal(copy.eyebrow, "Custom eyebrow");
    assert.equal(copy.title, "Custom title");
    assert.equal(copy.ctaHref, "/custom");
    assert.ok(copy.description); // default filled
  });

  it("resolves curated product selection and falls back when empty", () => {
    const all = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ];
    assert.deepEqual(
      resolveCuratedById(all, ["c", "a"], all, 2).map((x) => x.id),
      ["c", "a"],
    );
    assert.deepEqual(
      resolveCuratedById(all, [], all, 2).map((x) => x.id),
      ["a", "b"],
    );
  });

  it("resolves curated collection selection", () => {
    const all = [
      { id: "col-1", name: "One" },
      { id: "col-2", name: "Two" },
    ];
    assert.deepEqual(
      resolveCuratedById(all, ["col-2"], all, 5).map((x) => x.id),
      ["col-2"],
    );
  });

  it("skips invalid content references and falls back when none resolve", () => {
    const all = [
      { id: "real-1", title: "Real" },
      { id: "real-2", title: "Real 2" },
    ];
    assert.deepEqual(
      resolveCuratedById(
        all,
        ["missing", "also-missing"],
        all,
        2,
      ).map((x) => x.id),
      ["real-1", "real-2"],
    );
    assert.deepEqual(
      resolveCuratedById(all, ["missing", "real-2"], all, 2).map((x) => x.id),
      ["real-2"],
    );
  });

  it("normalizes hero and round-trips document shape for future DB storage", () => {
    const hero = normalizeHomepageHero({
      headline: "Hello",
      featuredProductId: "vid-1",
      collage: {
        viralDanceProductId: "vid-10",
        aiImageProductId: "img-1",
        motionControlProductId: "vid-11",
        toolId: "tool-1",
        previewVideoIds: ["vid-a", "vid-b", "vid-c", "vid-d"],
      },
    });
    assert.equal(hero.headline, "Hello");
    assert.equal(hero.ctaHref, DEFAULT_HOMEPAGE_HERO.ctaHref);
    assert.equal(hero.featuredProductId, "vid-1");
    assert.equal(hero.collage.viralDanceProductId, "vid-10");
    assert.equal(hero.collage.toolId, "tool-1");
    assert.deepEqual(hero.collage.previewVideoIds, ["vid-a", "vid-b", "vid-c"]);
    assert.equal(isHomepageHeroCollageCurated(hero.collage), true);

    const legacyWithoutCollage = normalizeHomepageHero({
      headline: "Legacy",
      featuredProductId: "vid-2",
    });
    assert.deepEqual(legacyWithoutCollage.collage.previewVideoIds, []);
    assert.equal(legacyWithoutCollage.collage.viralDanceProductId, "");
    assert.equal(isHomepageHeroCollageCurated(legacyWithoutCollage.collage), false);

    const doc = toHomepageConfigDocument(DEFAULT_HOMEPAGE_SECTIONS, hero);
    assert.equal(doc.version, 1);
    const restored = fromHomepageConfigDocument(doc);
    assert.equal(restored.hero.headline, "Hello");
    assert.deepEqual(restored.hero.collage.previewVideoIds, [
      "vid-a",
      "vid-b",
      "vid-c",
    ]);
    assert.equal(restored.sections.length, HOMEPAGE_SECTION_IDS.length);
  });

  it("fresh homepageHero defaults use approved PRAGVI hero copy", () => {
    assert.equal(DEFAULT_HOMEPAGE_HERO.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(DEFAULT_HOMEPAGE_HERO.ctaText, APPROVED_HOMEPAGE_HERO_CTA_TEXT);
    assert.equal(DEFAULT_HOMEPAGE_HERO.ctaHref, APPROVED_HOMEPAGE_HERO_CTA_HREF);
    const fresh = normalizeHomepageHero(undefined);
    assert.equal(fresh.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(fresh.ctaText, APPROVED_HOMEPAGE_HERO_CTA_TEXT);
    assert.equal(fresh.ctaHref, APPROVED_HOMEPAGE_HERO_CTA_HREF);
  });

  it("migrates exact legacy seed headline and CTA to approved copy", () => {
    const legacy = {
      eyebrow: "AI character dance videos",
      headline: LEGACY_SEED_HOMEPAGE_HERO_HEADLINE,
      supportingText: "License premium vertical routines.",
      featuredProductId: "vid-002",
      ctaText: LEGACY_SEED_HOMEPAGE_HERO_CTA_TEXT,
      ctaHref: "/explore",
    };
    assert.equal(homepageHeroNeedsLegacyCopyMigration(legacy), true);

    const migrated = normalizeHomepageHero(legacy);
    assert.equal(migrated.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(migrated.ctaText, APPROVED_HOMEPAGE_HERO_CTA_TEXT);
    assert.equal(migrated.ctaHref, "/explore");
    assert.equal(migrated.eyebrow, legacy.eyebrow);
    assert.equal(migrated.supportingText, legacy.supportingText);
    assert.equal(migrated.featuredProductId, legacy.featuredProductId);
  });

  it("preserves custom administrator headline and CTA", () => {
    const custom = {
      eyebrow: "Keep me",
      headline: "Our custom hero line",
      supportingText: "Keep supporting",
      featuredProductId: "vid-custom",
      ctaText: "Shop now",
      ctaHref: "/videos",
    };
    assert.equal(homepageHeroNeedsLegacyCopyMigration(custom), false);

    const normalized = normalizeHomepageHero(custom);
    assert.equal(normalized.headline, "Our custom hero line");
    assert.equal(normalized.ctaText, "Shop now");
    assert.equal(normalized.ctaHref, "/videos");
    assert.equal(normalized.eyebrow, "Keep me");
    assert.equal(normalized.supportingText, "Keep supporting");
    assert.equal(normalized.featuredProductId, "vid-custom");

    const partial = migrateLegacyHomepageHeroCopy({
      ...DEFAULT_HOMEPAGE_HERO,
      headline: LEGACY_SEED_HOMEPAGE_HERO_HEADLINE,
      ctaText: "Shop custom CTA",
    });
    assert.equal(partial.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(partial.ctaText, "Shop custom CTA");
  });

  it("CMS homepageHero edits are what the storefront hero config exposes", () => {
    // Mirrors Admin save → normalizeHomepageHero → useHomepageConfig().hero
    const saved = normalizeHomepageHero({
      headline: "Ready-to-Use AI Content for Social Media",
      ctaText: "Explore Marketplace",
      ctaHref: "/explore",
      featuredProductId: "vid-002",
    });
    assert.equal(saved.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(saved.ctaText, APPROVED_HOMEPAGE_HERO_CTA_TEXT);
    assert.equal(saved.ctaHref, "/explore");
    // Section copy must not be consulted as an override path.
    assert.notEqual(
      LEGACY_SEED_HOMEPAGE_HERO_HEADLINE,
      saved.headline,
    );
  });

  it("empty curated selection uses fallback list (storefront behavior)", () => {
    const products = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
    const picked = resolveCuratedById(products, undefined, products, 2);
    assert.deepEqual(
      picked.map((p) => p.id),
      ["p1", "p2"],
    );
  });

  it("normalize is idempotent after reload-style re-parse", () => {
    const first = normalizeHomepageSections([
      {
        id: "featured",
        enabled: false,
        order: 3,
        label: "Legacy",
        copy: { title: "Saved title" },
      },
    ]);
    const reloaded = normalizeHomepageSections(JSON.parse(JSON.stringify(first)));
    assert.deepEqual(reloaded, first);
    assert.equal(
      reloaded.find((s) => s.id === "featured-videos")?.copy?.title,
      "Saved title",
    );
  });
});
