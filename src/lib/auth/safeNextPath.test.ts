import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAuthCallbackUrl,
  normalizeAppPathname,
  safeNextPath,
} from "./safeNextPath";

describe("safeNextPath", () => {
  it("allows relative storefront destinations", () => {
    assert.equal(safeNextPath("/checkout"), "/checkout");
    assert.equal(safeNextPath("/account"), "/account");
    assert.equal(safeNextPath("/library/vid-001"), "/library/vid-001");
    assert.equal(safeNextPath("  /checkout  "), "/checkout");
  });

  it("strips query/hash from return paths", () => {
    assert.equal(safeNextPath("/checkout?x=1"), "/checkout");
    assert.equal(safeNextPath("/account#settings"), "/account");
  });

  it("rejects open redirects and auth loops", () => {
    assert.equal(safeNextPath("https://evil.example"), "/account");
    assert.equal(safeNextPath("//evil.example"), "/account");
    assert.equal(safeNextPath("/signin"), "/account");
    assert.equal(safeNextPath("/admin"), "/account");
    assert.equal(safeNextPath("/admin/login"), "/account");
    assert.equal(safeNextPath("/api/library/download"), "/account");
    assert.equal(safeNextPath("/auth/callback"), "/account");
  });

  it("rejects path traversal after normalization", () => {
    assert.equal(safeNextPath("/foo/../../admin"), "/account");
    assert.equal(safeNextPath("/../admin"), "/account");
    assert.equal(safeNextPath("/account/../../../api/admin"), "/account");
    assert.equal(safeNextPath("/%2e%2e/admin"), "/account");
    assert.equal(safeNextPath("/%2E%2E/%2e%2e/admin"), "/account");
    assert.equal(safeNextPath("/library/../admin"), "/account");
  });

  it("builds callback URLs with encoded next", () => {
    const url = buildAuthCallbackUrl("http://localhost:3000", "/checkout");
    assert.equal(
      url,
      "http://localhost:3000/auth/callback?next=%2Fcheckout",
    );
  });
});

describe("normalizeAppPathname", () => {
  it("resolves dot segments safely", () => {
    assert.equal(normalizeAppPathname("/a/./b"), "/a/b");
    assert.equal(normalizeAppPathname("/a/b/../c"), "/a/c");
    assert.equal(normalizeAppPathname("/../admin"), null);
  });
});
