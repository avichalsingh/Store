/**
 * Run with: npx tsx --test src/lib/security/__tests__/ssrf.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeOutboundUrl } from "../ssrf";
import { isAllowedStorefrontMediaUrl } from "../publicMedia";

describe("assertSafeOutboundUrl", () => {
  it("allows public https", () => {
    assert.equal(assertSafeOutboundUrl("https://example.com/page"), null);
  });

  it("blocks localhost and metadata", () => {
    assert.ok(assertSafeOutboundUrl("http://127.0.0.1/"));
    assert.ok(assertSafeOutboundUrl("http://localhost/"));
    assert.ok(assertSafeOutboundUrl("http://169.254.169.254/latest"));
    assert.ok(assertSafeOutboundUrl("http://192.168.1.1/"));
  });

  it("blocks credentialed URLs", () => {
    assert.ok(assertSafeOutboundUrl("https://user:pass@example.com/"));
  });
});

describe("isAllowedStorefrontMediaUrl", () => {
  it("rejects private masters and signed URLs", () => {
    assert.equal(
      isAllowedStorefrontMediaUrl("media-masters/p/a/master.mp4"),
      false,
    );
    assert.equal(
      isAllowedStorefrontMediaUrl(
        "https://abc.supabase.co/storage/v1/object/sign/media-masters/x?token=abc",
      ),
      false,
    );
  });

  it("allows media-previews and root-relative assets", () => {
    assert.equal(
      isAllowedStorefrontMediaUrl(
        "https://abc.supabase.co/storage/v1/object/public/media-previews/p/a/preview.mp4",
      ),
      true,
    );
    assert.equal(isAllowedStorefrontMediaUrl("/media/videos/neon.jpg"), true);
  });
});
