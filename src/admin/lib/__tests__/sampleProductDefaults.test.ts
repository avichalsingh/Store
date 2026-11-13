import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertAllSampleTypesPopulate,
  createSampleAdminProduct,
  sampleProductRequiredFieldGaps,
  switchSampleProductType,
} from "@/admin/lib/sampleProductDefaults";
import { slugify } from "@/admin/lib/format";
import {
  PUBLIC_MERCHANDISING_METRICS_ENABLED,
  isPublishablePerformanceMode,
  publicCreatorActivity,
  publicPerformance,
} from "@/catalog/publicPerformance";
import { PRODUCT_TYPES, type ProductType } from "@/catalog/productTypes";
import type { ProductPerformance, CreatorActivity } from "@/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXED_NOW = new Date("2026-11-14T10:00:00.000Z");

describe("sampleProductDefaults — new product templates", () => {
  it("every supported product type opens with populated applicable fields", () => {
    const all = assertAllSampleTypesPopulate(["taken-slug"]);
    for (const type of PRODUCT_TYPES) {
      const product = all[type];
      assert.equal(product.productType, type);
      assert.ok(product.name.trim().length > 3);
      assert.ok(product.slug.trim().length > 3);
      assert.ok(product.shortDescription.trim().length > 20);
      assert.ok(product.description.trim().length > 40);
      assert.ok(product.tags.length >= 3);
      assert.ok(product.pricing.INR.currentPrice > 0);
      assert.ok(product.pricing.USD.currentPrice > 0);
      assert.ok(product.pricing.INR.regularPrice >= product.pricing.INR.currentPrice);
      assert.ok(product.pricing.USD.regularPrice >= product.pricing.USD.currentPrice);
      assert.equal(product.status, "draft");
      assert.equal(product.performance.mode, "demo");
      assert.equal(product.creatorActivity.mode, "demo");
      assert.equal(sampleProductRequiredFieldGaps(product).length, 0);
    }
  });

  it("all required fields have valid defaults (no empty placeholders)", () => {
    for (const type of PRODUCT_TYPES) {
      const product = createSampleAdminProduct(type, { now: FIXED_NOW });
      const blob = JSON.stringify({
        name: product.name,
        slug: product.slug,
        shortDescription: product.shortDescription,
        description: product.description,
        tags: product.tags,
        category: product.category,
        access: product.access,
      }).toLowerCase();
      for (const banned of [
        "test product",
        "lorem ipsum",
        "description here",
        "todo",
        "placeholder text",
      ]) {
        assert.equal(
          blob.includes(banned),
          false,
          `${type} should not include “${banned}”`,
        );
      }
      assert.ok(product.offer.enabled);
      assert.ok(product.offer.label.trim());
      assert.ok(product.offer.startDate);
      assert.ok(product.offer.endDate);
      assert.ok(product.campaign.enabled);
      assert.ok(product.campaign.headline.trim());
      assert.ok((product.campaign.microMessages?.length ?? 0) > 0);
    }
  });

  it("generated slugs are valid and unique against existing catalogue slugs", () => {
    const existing = ["neon-shuffle-vertical-ai-dance-cut-abc123"];
    const a = createSampleAdminProduct("VIDEO", {
      id: "vid-aaaaaa",
      existingSlugs: existing,
      now: FIXED_NOW,
    });
    const b = createSampleAdminProduct("VIDEO", {
      id: "vid-bbbbbb",
      existingSlugs: [...existing, a.slug],
      now: FIXED_NOW,
    });
    assert.equal(a.slug, slugify(a.slug));
    assert.equal(b.slug, slugify(b.slug));
    assert.notEqual(a.slug, b.slug);
    assert.equal(existing.includes(a.slug), false);
    assert.match(a.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("type switching updates type-specific fields while preserving shared edits", () => {
    const video = createSampleAdminProduct("VIDEO", {
      id: "vid-switch1",
      now: FIXED_NOW,
    });
    video.name = "My Custom Clip Title";
    video.slug = "my-custom-clip-title";
    video.shortDescription = "Edited short copy kept across types.";
    video.pricing.INR.currentPrice = 777;
    video.pricing.USD.currentPrice = 9.5;

    const prompt = switchSampleProductType(video, "PROMPT", { now: FIXED_NOW });
    assert.equal(prompt.id, video.id);
    assert.equal(prompt.productType, "PROMPT");
    assert.equal(prompt.name, "My Custom Clip Title");
    assert.equal(prompt.slug, "my-custom-clip-title");
    assert.equal(prompt.shortDescription, "Edited short copy kept across types.");
    assert.equal(prompt.pricing.INR.currentPrice, 777);
    assert.equal(prompt.pricing.USD.currentPrice, 9.5);
    assert.ok(prompt.promptData?.mainPrompt?.trim());
    assert.equal(prompt.status, "draft");
    assert.equal(prompt.performance.mode, "demo");

    const image = switchSampleProductType(prompt, "AI_IMAGE", { now: FIXED_NOW });
    assert.equal(image.productType, "AI_IMAGE");
    assert.equal(image.name, "My Custom Clip Title");
    assert.ok(image.aiImageData?.resolution);
    assert.equal(image.performance.mode, "demo");

    const caption = switchSampleProductType(image, "CAPTION_PACK", {
      now: FIXED_NOW,
    });
    assert.equal(caption.productType, "CAPTION_PACK");
    assert.ok((caption.captionPackData?.items.length ?? 0) >= 1);

    const bundle = switchSampleProductType(caption, "BUNDLE", { now: FIXED_NOW });
    assert.equal(bundle.productType, "BUNDLE");
    assert.ok(bundle.bundleData);
    assert.equal(bundle.name, "My Custom Clip Title");
  });

  it("save-draft shaped samples stay draft and preserve edited sample content", () => {
    const draft = createSampleAdminProduct("AI_IMAGE", { now: FIXED_NOW });
    draft.name = "Edited Portrait Title";
    draft.slug = "edited-portrait-title";
    draft.pricing.INR.currentPrice = 501;
    draft.tags = ["edited", "portrait", "sample"];
    // Simulate local CMS save payload (status remains draft unless Publish).
    const saved = {
      ...draft,
      status: "draft" as const,
      updatedAt: new Date("2026-11-14T12:00:00.000Z").toISOString(),
    };
    assert.equal(saved.status, "draft");
    assert.equal(saved.name, "Edited Portrait Title");
    assert.equal(saved.pricing.INR.currentPrice, 501);
    assert.deepEqual(saved.tags, ["edited", "portrait", "sample"]);
    assert.equal(saved.performance.mode, "demo");
  });

  it("opening the form performs no remote write (pure local sample factory)", () => {
    const editorPath = join(
      process.cwd(),
      "src/admin/components/ProductEditor.tsx",
    );
    const editorSrc = readFileSync(editorPath, "utf8");
    assert.match(editorSrc, /createSampleAdminProduct/);
    // Boot path: sample factory + setDraft only — publish/upsert live in save(), not init.
    const initStart = editorSrc.indexOf("const init = async () => {");
    const initEnd = editorSrc.indexOf("void init();", initStart);
    assert.ok(initStart > 0 && initEnd > initStart);
    const initBlock = editorSrc.slice(initStart, initEnd);
    assert.match(initBlock, /createSampleAdminProduct/);
    assert.doesNotMatch(initBlock, /publishProductToCatalog/);
    assert.doesNotMatch(initBlock, /upsertProduct/);

    const factorySrc = readFileSync(
      join(process.cwd(), "src/admin/lib/sampleProductDefaults.ts"),
      "utf8",
    );
    assert.doesNotMatch(factorySrc, /\bfetch\s*\(/);
    assert.doesNotMatch(factorySrc, /createClient|@supabase|\.from\(/);
    assert.doesNotMatch(factorySrc, /publishProductToCatalog/);

    const before = createSampleAdminProduct("VIDEO", {
      id: "vid-pure01",
      now: FIXED_NOW,
    });
    assert.equal(before.status, "draft");
    assert.equal(before.sales, 0);
  });

  it("no sample product is automatically published", () => {
    for (const type of PRODUCT_TYPES) {
      const product = createSampleAdminProduct(type as ProductType, {
        now: FIXED_NOW,
      });
      assert.equal(product.status, "draft");
      assert.notEqual(product.status, "active");
    }
    const switched = switchSampleProductType(
      createSampleAdminProduct("VIDEO", { now: FIXED_NOW }),
      "BUNDLE",
      { now: FIXED_NOW },
    );
    assert.equal(switched.status, "draft");
  });

  it("demo performance metrics cannot become fabricated public social proof", () => {
    assert.equal(PUBLIC_MERCHANDISING_METRICS_ENABLED, false);
    for (const type of PRODUCT_TYPES) {
      const product = createSampleAdminProduct(type, { now: FIXED_NOW });
      assert.equal(product.performance.mode, "demo");
      assert.equal(product.creatorActivity.mode, "demo");
      assert.equal(isPublishablePerformanceMode(product.performance.mode), false);
      assert.equal(isPublishablePerformanceMode(product.creatorActivity.mode), false);

      const asStorefrontPerf: ProductPerformance = {
        type: "trending",
        primaryMetric: product.performance.plays,
        primaryNumeric: product.performance.playsNumeric,
        primaryLabel: product.performance.metricLabel ?? "PLAYS",
        secondaryMetrics: [
          {
            label: "Likes",
            value: product.performance.likes,
            numeric: product.performance.likesNumeric,
          },
        ],
        insight: product.performance.insight,
        badge: product.performance.badge,
        mode: product.performance.mode,
      };
      assert.equal(publicPerformance(asStorefrontPerf), undefined);

      const asActivity: CreatorActivity = {
        addedThisWeek: product.creatorActivity.addedThisWeek,
        saved: product.creatorActivity.saved,
        last24h: product.creatorActivity.last24h,
        activityLevel: "steady",
        note: product.creatorActivity.note,
        mode: product.creatorActivity.mode,
      };
      assert.equal(publicCreatorActivity(asActivity), undefined);
    }
  });

  it("media fields use sample placeholders without fabricated storage URLs", () => {
    for (const type of PRODUCT_TYPES) {
      const product = createSampleAdminProduct(type, { now: FIXED_NOW });
      assert.equal(product.media.thumbnail.includes("supabase"), false);
      assert.equal(product.media.thumbnail.startsWith("http"), false);
      if (product.media.downloadFileName) {
        assert.match(product.media.downloadFileName, /SAMPLE_PLACEHOLDER/);
      }
      if (type === "AI_IMAGE") {
        assert.deepEqual(product.aiImageData?.images ?? [], []);
      }
    }
  });
});
