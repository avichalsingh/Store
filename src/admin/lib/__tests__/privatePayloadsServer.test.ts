/**
 * Server-only private seed accessor + public API isolation.
 * Run with CJS stub (server-only throws under Node without it):
 *   ./node_modules/.bin/tsx -r ./scripts/cjs-stub-server-only.cjs --test \
 *     src/admin/lib/__tests__/privatePayloadsServer.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  getSeedPrivatePayload,
  listSeedPrivatePayloadProductIds,
} from "@/admin/lib/privateProductPayloads.server";
import {
  deriveAdminSessionToken,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("getSeedPrivatePayload (server-only)", () => {
  it("returns payloads for known seed products and null for unknown", () => {
    const ids = listSeedPrivatePayloadProductIds();
    assert.ok(ids.length > 0);
    assert.ok(ids.includes("prod-prompt-001"));
    const payload = getSeedPrivatePayload("prod-prompt-001");
    assert.ok(payload?.promptData?.mainPrompt);
    assert.ok((payload!.promptData!.mainPrompt as string).length > 20);
    assert.equal(getSeedPrivatePayload("does-not-exist"), null);
    assert.equal(getSeedPrivatePayload("  "), null);
  });
});

describe("admin private-payloads authorization gates", () => {
  it("rejects missing/forged tokens; accepts derived session token", () => {
    const prev = process.env.ADMIN_API_SECRET;
    process.env.ADMIN_API_SECRET = "test-admin-secret-for-private-payloads";
    try {
      assert.equal(isAdminSessionTokenValid(undefined), false);
      assert.equal(isAdminSessionTokenValid(""), false);
      assert.equal(isAdminSessionTokenValid("forged"), false);
      const token = deriveAdminSessionToken();
      assert.ok(token);
      assert.equal(isAdminSessionTokenValid(token), true);
    } finally {
      if (prev === undefined) delete process.env.ADMIN_API_SECRET;
      else process.env.ADMIN_API_SECRET = prev;
    }
  });

  it("route returns 401 path with no private field literals", () => {
    const routeSrc = readFileSync(
      join(root, "app/api/admin/private-payloads/route.ts"),
      "utf8",
    );
    assert.match(routeSrc, /isAdminSessionTokenValid/);
    assert.match(routeSrc, /status:\s*401/);
    assert.match(routeSrc, /getSeedPrivatePayload/);
    assert.doesNotMatch(routeSrc, /mainPrompt/);
    assert.doesNotMatch(routeSrc, /captionPackData:\s*\{/);
  });
});

describe("public catalogue / customer APIs never import private seed", () => {
  const publicFiles = [
    "app/api/catalog/route.ts",
    "app/api/homepage/route.ts",
    "app/api/library/content/route.ts",
    "app/api/webhooks/razorpay/route.ts",
    "catalog/useCatalog.ts",
    "catalog/mapAdminToStorefront.ts",
    "catalog/publicSafeProduct.ts",
  ];

  for (const rel of publicFiles) {
    it(`${rel} does not import marketplacePrivatePayloads`, () => {
      const src = readFileSync(join(root, rel), "utf8");
      assert.doesNotMatch(src, /marketplacePrivatePayloads/);
      assert.doesNotMatch(src, /privateProductPayloads\.server/);
      assert.doesNotMatch(src, /\/api\/admin\/private-payloads/);
    });
  }

  it("client-importable marketplaceSeed has empty private prompt bodies", () => {
    const seed = readFileSync(
      join(root, "admin/data/marketplaceSeed.ts"),
      "utf8",
    );
    assert.doesNotMatch(seed, /mainPrompt:\s*"[^"]{20,}"/);
    assert.doesNotMatch(seed, /negativePrompt:\s*"[^"]{8,}"/);
    assert.doesNotMatch(seed, /text:\s*"[^"]{20,}"/);
  });
});
