/**
 * Stage 6A — storefront CMS must not hold private paid prompt/caption bodies.
 * Run: npx tsx --test src/catalog/__tests__/publicSafeProduct.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createSeedState } from "@/admin/data/seed";
import { CMS_STORAGE_KEY } from "@/catalog/cmsEvents";
import {
  extractPrivatePaidProductPayload,
  mergePrivatePaidProductPayload,
  preferRicherPrivatePayload,
  PUBLIC_CAPTION_TEASER_NOTES,
  stripPrivatePaidProductFields,
  stripPrivatePaidProducts,
} from "@/catalog/publicSafeProduct";
import type { AdminProduct } from "@/admin/types";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function samplePrompt(): AdminProduct {
  return {
    id: "prod-prompt-test",
    name: "Test Prompt",
    slug: "test-prompt",
    productType: "PROMPT",
    category: "Test",
    shortDescription: "short",
    description: "long",
    tags: [],
    status: "active",
    isTrending: false,
    isFeatured: false,
    media: { thumbnail: "/t.jpg" },
    pricing: {
      INR: { regularPrice: 100, currentPrice: 80 },
      USD: { regularPrice: 2, currentPrice: 1 },
    },
    offer: { enabled: false, label: "" },
    performance: {
      mode: "demo",
      plays: "0",
      playsNumeric: 0,
      likes: "0",
      likesNumeric: 0,
      shares: "0",
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
    duration: "",
    resolution: "",
    format: "",
    access: "",
    licenses: [],
    sales: 0,
    revenueInr: 0,
    relationships: [],
    collectionIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    promptData: {
      mainPrompt: "SECRET full prompt body for generation",
      negativePrompt: "SECRET negative",
      generationSettings: "CFG 7",
      modelNotes: "private notes",
      instructions: "private instructions",
      publicTeaser: "Safe public teaser only",
      canGenerate: "Portraits and reels",
      sectionCount: 2,
    },
  };
}

function sampleCaption(): AdminProduct {
  const base = samplePrompt();
  return {
    ...base,
    id: "prod-caption-test",
    slug: "test-caption",
    productType: "CAPTION_PACK",
    promptData: undefined,
    captionPackData: {
      items: [
        {
          id: "i1",
          caption: "Full private caption text that buyers unlock after purchase",
          hashtags: ["#viral", "#reels", "#dance"],
          label: "Hook",
        },
      ],
    },
  };
}

describe("stripPrivatePaidProductFields", () => {
  it("removes mainPrompt / negativePrompt but keeps public teaser metadata", () => {
    const stripped = stripPrivatePaidProductFields(samplePrompt());
    assert.equal(stripped.promptData?.mainPrompt, "");
    assert.equal(stripped.promptData?.negativePrompt, "");
    assert.equal(stripped.promptData?.generationSettings, "");
    assert.equal(stripped.promptData?.modelNotes, "");
    assert.equal(stripped.promptData?.instructions, "");
    assert.equal(stripped.promptData?.publicTeaser, "Safe public teaser only");
    assert.equal(stripped.promptData?.canGenerate, "Portraits and reels");
    assert.equal(stripped.promptData?.sectionCount, 2);
  });

  it("removes caption items bodies but keeps public teaser leads", () => {
    const stripped = stripPrivatePaidProductFields(sampleCaption());
    const item = stripped.captionPackData?.items[0];
    assert.ok(item);
    assert.notEqual(
      item!.caption,
      "Full private caption text that buyers unlock after purchase",
    );
    assert.ok(item!.caption.length > 0, "public teaser lead preserved");
    assert.ok(item!.caption.length < 40);
    assert.ok((item!.hashtags?.length ?? 0) <= 1);
    assert.equal(item!.label, "Hook");
    assert.equal(item!.notes, PUBLIC_CAPTION_TEASER_NOTES);
  });

  it("extract + merge round-trips private fields for admin editing", () => {
    const full = samplePrompt();
    const extracted = extractPrivatePaidProductPayload(full);
    assert.ok(extracted?.promptData?.mainPrompt?.includes("SECRET"));
    const stripped = stripPrivatePaidProductFields(full);
    const restored = mergePrivatePaidProductPayload(stripped, extracted);
    assert.equal(restored.promptData?.mainPrompt, full.promptData?.mainPrompt);
    assert.equal(
      restored.promptData?.negativePrompt,
      full.promptData?.negativePrompt,
    );
    assert.equal(
      restored.promptData?.publicTeaser,
      "Safe public teaser only",
    );
  });

  it("preferRicherPrivatePayload keeps vault over teaser-thin extract", () => {
    const rich = extractPrivatePaidProductPayload(sampleCaption())!;
    const thin = extractPrivatePaidProductPayload(
      stripPrivatePaidProductFields(sampleCaption()),
    );
    assert.equal(thin, null);
    const kept = preferRicherPrivatePayload(rich, rich);
    assert.equal(
      kept.captionPackData?.items[0]?.caption,
      rich.captionPackData?.items[0]?.caption,
    );
  });
});

describe("seed + shared CMS persistence stay public-safe", () => {
  it("createSeedState products have no private prompt/caption bodies", () => {
    const seed = createSeedState();
    for (const product of seed.products) {
      const prompt = product.promptData?.mainPrompt?.trim() || "";
      const negative = product.promptData?.negativePrompt?.trim() || "";
      assert.equal(prompt, "", product.id);
      assert.equal(negative, "", product.id);
      for (const item of product.captionPackData?.items ?? []) {
        if (item.notes === PUBLIC_CAPTION_TEASER_NOTES) continue;
        assert.equal((item.caption || "").trim(), "", `${product.id} caption`);
        assert.deepEqual(
          (item.hashtags || []).filter(Boolean),
          [],
          `${product.id} hashtags`,
        );
      }
    }
  });

  it("serialized shared CMS JSON never contains private prompt bodies", () => {
    const seed = createSeedState();
    const publicSafe = {
      ...seed,
      products: stripPrivatePaidProducts(seed.products),
    };
    const json = JSON.stringify(publicSafe);
    // Full private body from marketplacePrivatePayloads (teasers may share a lead).
    assert.doesNotMatch(
      json,
      /consistent character sheet, multiple angles, ultra detailed/,
    );
    assert.doesNotMatch(
      json,
      /subsurface scattering, soft global illumination, charming personality/,
    );
    assert.doesNotMatch(json, /"mainPrompt":"[^"]{20,}"/);
    assert.doesNotMatch(json, /"negativePrompt":"[^"]{8,}"/);
    assert.equal(CMS_STORAGE_KEY, "rhythm-admin-cms-v8");
  });

  it("AdminProvider strips private products and never merges seed vault", () => {
    const provider = readFileSync(
      join(root, "admin/store/AdminProvider.tsx"),
      "utf8",
    );
    assert.match(provider, /stripPrivatePaidProducts/);
    assert.match(provider, /stripPrivatePaidProducts\(prev\.products\)/);
    assert.doesNotMatch(provider, /loadSeedPrivatePayloads/);
    assert.doesNotMatch(provider, /persistPrivatePayloadMap/);
    assert.doesNotMatch(provider, /applyPrivatePayloadsToProducts/);
    assert.doesNotMatch(provider, /isAdminCmsContext/);
    assert.doesNotMatch(provider, /marketplacePrivatePayloads/);
  });

  it("marketplace private payloads are server-only (no client import)", () => {
    const seed = readFileSync(join(root, "admin/data/seed.ts"), "utf8");
    const provider = readFileSync(
      join(root, "admin/store/AdminProvider.tsx"),
      "utf8",
    );
    const vault = readFileSync(
      join(root, "admin/lib/privateProductPayloads.ts"),
      "utf8",
    );
    const priv = readFileSync(
      join(root, "admin/data/marketplacePrivatePayloads.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      seed,
      /from ["']@\/admin\/data\/marketplacePrivatePayloads["']/,
    );
    assert.doesNotMatch(
      seed,
      /import\(["']@\/admin\/data\/marketplacePrivatePayloads["']\)/,
    );
    assert.doesNotMatch(
      provider,
      /from ["']@\/admin\/data\/marketplacePrivatePayloads["']/,
    );
    assert.doesNotMatch(
      vault,
      /from ["']@\/admin\/data\/marketplacePrivatePayloads["']/,
    );
    assert.doesNotMatch(
      vault,
      /import\(["']@\/admin\/data\/marketplacePrivatePayloads["']\)/,
    );
    assert.match(priv, /import ["']server-only["']/);
    assert.match(vault, /\/api\/admin\/private-payloads/);
  });
});
