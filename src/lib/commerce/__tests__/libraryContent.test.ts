/**
 * Stage 6A — entitlement-gated library text content.
 * Run: npx tsx --test src/lib/commerce/__tests__/libraryContent.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createEntitledLibraryContent } from "@/lib/commerce/libraryContent";
import type { SupabaseClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

type EntitlementRow = { id: string; user_id: string; product_id: string };
type ProductRow = {
  id: string;
  name: string;
  product_type: string;
  status: string;
  prompt_data: unknown;
  caption_pack_data: unknown;
};

function mockAdmin(opts: {
  entitlements?: EntitlementRow[];
  products?: ProductRow[];
  productError?: boolean;
}): SupabaseClient {
  const entitlements = opts.entitlements ?? [];
  const products = opts.products ?? [];

  const client = {
    from(table: string) {
      if (table === "entitlements") {
        let userId = "";
        let productId = "";
        const builder = {
          select() {
            return builder;
          },
          eq(col: string, val: string) {
            if (col === "user_id") userId = val;
            if (col === "product_id") productId = val;
            return builder;
          },
          async maybeSingle() {
            const hit = entitlements.find(
              (e) => e.user_id === userId && e.product_id === productId,
            );
            return { data: hit ? { id: hit.id } : null, error: null };
          },
        };
        return builder;
      }
      if (table === "products") {
        let productId = "";
        const builder = {
          select() {
            return builder;
          },
          eq(col: string, val: string) {
            if (col === "id") productId = val;
            return builder;
          },
          async maybeSingle() {
            if (opts.productError) {
              return { data: null, error: { message: "db" } };
            }
            const hit = products.find((p) => p.id === productId) ?? null;
            return { data: hit, error: null };
          },
        };
        return builder;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
  return client as unknown as SupabaseClient;
}

describe("createEntitledLibraryContent authorization", () => {
  it("rejects invalid product id", async () => {
    const admin = mockAdmin({});
    const result = await createEntitledLibraryContent(admin, {
      userId: "user-a",
      productId: "   ",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
    assert.equal(result.code, "BAD_PRODUCT_ID");
  });

  it("rejects unpaid authenticated user with 403", async () => {
    const admin = mockAdmin({
      products: [
        {
          id: "prod-prompt-1",
          name: "Prompt",
          product_type: "PROMPT",
          status: "active",
          prompt_data: { mainPrompt: "secret" },
          caption_pack_data: null,
        },
      ],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "user-unpaid",
      productId: "prod-prompt-1",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
    assert.equal(result.code, "ENTITLEMENT_REQUIRED");
  });

  it("rejects another customer's product with 403", async () => {
    const admin = mockAdmin({
      entitlements: [
        {
          id: "ent-1",
          user_id: "owner-user",
          product_id: "prod-prompt-1",
        },
      ],
      products: [
        {
          id: "prod-prompt-1",
          name: "Prompt",
          product_type: "PROMPT",
          status: "active",
          prompt_data: { mainPrompt: "secret for owner" },
          caption_pack_data: null,
        },
      ],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "other-user",
      productId: "prod-prompt-1",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 403);
  });

  it("returns prompt content for entitled customer", async () => {
    const admin = mockAdmin({
      entitlements: [
        {
          id: "ent-1",
          user_id: "buyer",
          product_id: "prod-prompt-1",
        },
      ],
      products: [
        {
          id: "prod-prompt-1",
          name: "Neon Prompt",
          product_type: "PROMPT",
          status: "active",
          prompt_data: {
            mainPrompt: "Full entitled prompt text",
            negativePrompt: "blurry",
            generationSettings: "CFG 6",
          },
          caption_pack_data: null,
        },
      ],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "buyer",
      productId: "prod-prompt-1",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.productType, "PROMPT");
    assert.equal(result.promptData?.mainPrompt, "Full entitled prompt text");
    assert.equal(result.promptData?.negativePrompt, "blurry");
    assert.equal(result.title, "Neon Prompt");
  });

  it("returns caption pack content for entitled customer", async () => {
    const admin = mockAdmin({
      entitlements: [
        {
          id: "ent-2",
          user_id: "buyer",
          product_id: "prod-caption-1",
        },
      ],
      products: [
        {
          id: "prod-caption-1",
          name: "Caption Pack",
          product_type: "CAPTION_PACK",
          status: "active",
          prompt_data: null,
          caption_pack_data: {
            items: [
              {
                id: "c1",
                caption: "Buy this caption",
                hashtags: ["#one", "#two"],
                label: "Hook",
              },
            ],
          },
        },
      ],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "buyer",
      productId: "prod-caption-1",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.productType, "CAPTION_PACK");
    assert.equal(result.captionPackData?.items[0]?.caption, "Buy this caption");
    assert.deepEqual(result.captionPackData?.items[0]?.hashtags, [
      "#one",
      "#two",
    ]);
  });

  it("rejects unsupported product type safely", async () => {
    const admin = mockAdmin({
      entitlements: [
        { id: "ent-3", user_id: "buyer", product_id: "vid-1" },
      ],
      products: [
        {
          id: "vid-1",
          name: "Video",
          product_type: "VIDEO",
          status: "active",
          prompt_data: null,
          caption_pack_data: null,
        },
      ],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "buyer",
      productId: "vid-1",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 400);
    assert.equal(result.code, "UNSUPPORTED_TYPE");
  });

  it("handles missing product safely after entitlement", async () => {
    const admin = mockAdmin({
      entitlements: [
        { id: "ent-4", user_id: "buyer", product_id: "missing" },
      ],
      products: [],
    });
    const result = await createEntitledLibraryContent(admin, {
      userId: "buyer",
      productId: "missing",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.status, 404);
    assert.equal(result.code, "PRODUCT_NOT_FOUND");
  });
});

describe("library content route + delivery guarantees", () => {
  it("route requires auth and sets private no-store headers", () => {
    const route = readFileSync(
      join(root, "app/api/library/content/route.ts"),
      "utf8",
    );
    assert.match(route, /getUser/);
    assert.match(route, /AUTH_REQUIRED/);
    assert.match(route, /createEntitledLibraryContent/);
    assert.match(route, /createServiceClient/);
    assert.match(route, /private, no-store/);
    assert.doesNotMatch(route, /mainPrompt.*localStorage/);
  });

  it("Library page fetches protected API and never falls back to AdminProvider private text", () => {
    const page = readFileSync(
      join(root, "app/(store)/library/[productId]/page.tsx"),
      "utf8",
    );
    const client = readFileSync(
      join(root, "lib/commerce/clientLibraryContent.ts"),
      "utf8",
    );
    assert.match(page, /fetchLibraryContent/);
    assert.match(client, /\/api\/library\/content/);
    assert.doesNotMatch(page, /adminProduct\?\.promptData/);
    assert.doesNotMatch(page, /adminProduct\?\.captionPackData/);
    assert.match(page, /SIGNED_OUT/);
    assert.match(page, /phase:\s*"unauthorized"/);
  });

  it("catalog API never selects private products columns", () => {
    const route = readFileSync(join(root, "app/api/catalog/route.ts"), "utf8");
    assert.match(route, /catalog_products/);
    assert.doesNotMatch(route, /\.from\("products"\)/);
    assert.doesNotMatch(route, /mainPrompt/);
  });

  it("client library content uses cache no-store", () => {
    const client = readFileSync(
      join(root, "lib/commerce/clientLibraryContent.ts"),
      "utf8",
    );
    assert.match(client, /cache:\s*"no-store"/);
    assert.match(client, /credentials:\s*"same-origin"/);
  });
});
