/**
 * Private CMS seed must stay server-only — never in client helpers / vault.
 * Run: npx tsx --test src/admin/lib/__tests__/privateProductPayloads.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  canAccessAdminPrivatePayloads,
  isAdminCmsContext,
  isAdminPrivateContentPath,
  loadPrivatePayloadMap,
  loadSeedPrivatePayloads,
  persistPrivatePayloadMap,
} from "@/admin/lib/privateProductPayloads";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("admin private path gating", () => {
  it("rejects /admin/login and non-admin paths", () => {
    assert.equal(isAdminPrivateContentPath("/admin/login"), false);
    assert.equal(isAdminPrivateContentPath("/admin/login/"), false);
    assert.equal(isAdminPrivateContentPath("/"), false);
    assert.equal(isAdminPrivateContentPath("/library/x"), false);
    assert.equal(isAdminPrivateContentPath("/admin"), true);
    assert.equal(isAdminPrivateContentPath("/admin/products"), true);
  });

  it("isAdminCmsContext is never true (localStorage is not authorization)", () => {
    assert.equal(isAdminCmsContext(), false);
  });

  it("vault load/persist/seed are fail-closed and never return seed bodies", async () => {
    assert.deepEqual(loadPrivatePayloadMap(), {});
    assert.deepEqual(loadPrivatePayloadMap({ authorized: true }), {});
    persistPrivatePayloadMap({
      x: { promptData: { mainPrompt: "nope" } },
    });
    assert.deepEqual(loadPrivatePayloadMap({ authorized: true }), {});
    assert.deepEqual(await loadSeedPrivatePayloads(), {});
    assert.deepEqual(await loadSeedPrivatePayloads({ authorized: true }), {});
  });

  it("canAccessAdminPrivatePayloads is false on login even if fetch would succeed", async () => {
    const ok = await canAccessAdminPrivatePayloads("/admin/login");
    assert.equal(ok, false);
  });
});

describe("server-only private seed boundary", () => {
  it("client helper never imports marketplacePrivatePayloads", () => {
    const vault = readFileSync(
      join(root, "admin/lib/privateProductPayloads.ts"),
      "utf8",
    );
    assert.doesNotMatch(
      vault,
      /from ["']@\/admin\/data\/marketplacePrivatePayloads["']/,
    );
    assert.doesNotMatch(
      vault,
      /import\(["']@\/admin\/data\/marketplacePrivatePayloads["']\)/,
    );
    assert.match(vault, /\/api\/admin\/private-payloads/);
    assert.match(vault, /\/api\/admin\/session/);
    assert.match(vault, /verifyAdminServerSession/);
    assert.doesNotMatch(vault, /getAdminSession\(\)/);
    assert.doesNotMatch(vault, /localStorage\.(get|set)Item/);
  });

  it("private payloads module declares server-only", () => {
    const priv = readFileSync(
      join(root, "admin/data/marketplacePrivatePayloads.ts"),
      "utf8",
    );
    assert.match(priv, /import ["']server-only["']/);
    const server = readFileSync(
      join(root, "admin/lib/privateProductPayloads.server.ts"),
      "utf8",
    );
    assert.match(server, /import ["']server-only["']/);
    assert.match(server, /marketplacePrivatePayloads/);
  });

  it("AdminProvider never merges vault/seed private bodies into CMS state", () => {
    const provider = readFileSync(
      join(root, "admin/store/AdminProvider.tsx"),
      "utf8",
    );
    assert.match(provider, /stripPrivatePaidProducts/);
    assert.doesNotMatch(provider, /loadSeedPrivatePayloads/);
    assert.doesNotMatch(provider, /loadPrivatePayloadMap/);
    assert.doesNotMatch(provider, /persistPrivatePayloadMap/);
    assert.doesNotMatch(provider, /applyPrivatePayloadsToProducts/);
    assert.doesNotMatch(provider, /canAccessAdminPrivatePayloads/);
    assert.doesNotMatch(provider, /isAdminCmsContext/);
    assert.doesNotMatch(provider, /marketplacePrivatePayloads/);
    assert.doesNotMatch(provider, /removeItem\(\s*PRIVATE_PAYLOADS/);
  });

  it("ProductEditor hydrates private bodies via authenticated admin API only", () => {
    const editor = readFileSync(
      join(root, "admin/components/ProductEditor.tsx"),
      "utf8",
    );
    assert.match(editor, /fetchAdminPrivatePayload/);
    assert.doesNotMatch(editor, /marketplacePrivatePayloads/);
    assert.doesNotMatch(editor, /loadSeedPrivatePayloads/);
    assert.doesNotMatch(editor, /loadPrivatePayloadMap/);
  });

  it("admin private-payloads API requires session cookie validation", () => {
    const route = readFileSync(
      join(root, "app/api/admin/private-payloads/route.ts"),
      "utf8",
    );
    assert.match(route, /isAdminSessionTokenValid/);
    assert.match(route, /ADMIN_SESSION_COOKIE/);
    assert.match(route, /getSeedPrivatePayload/);
    assert.match(route, /status:\s*401/);
  });
});
