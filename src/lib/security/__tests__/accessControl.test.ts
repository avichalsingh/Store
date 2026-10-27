/**
 * Critical access-control guarantees (static + pure helpers).
 * Run: npx tsx --test src/lib/security/__tests__/*.test.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isAllowedStorefrontMediaUrl } from "../publicMedia";
import { assertSafeOutboundUrl } from "../ssrf";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("paid download fail-closed", () => {
  it("library download route returns entitlement required / 403", () => {
    const src = readFileSync(
      join(root, "src/app/api/library/download/route.ts"),
      "utf8",
    );
    assert.match(src, /status:\s*403/);
    assert.match(src, /ENTITLEMENT_REQUIRED/);
    assert.doesNotMatch(src, /createSignedUrl/);
    assert.doesNotMatch(src, /SERVICE_ROLE/);
  });
});

describe("middleware admin gates", () => {
  it("gates /admin and /api/admin except login POST", () => {
    const src = readFileSync(join(root, "src/middleware.ts"), "utf8");
    assert.match(src, /isAdminCookieHeaderValidEdge/);
    assert.match(src, /\/admin\/login/);
    assert.match(src, /\/api\/admin/);
    assert.match(src, /\/api\/tools\//);
  });
});

describe("catalog never selects masters", () => {
  it("catalog API selects only public media_assets fields", () => {
    const src = readFileSync(
      join(root, "src/app/api/catalog/route.ts"),
      "utf8",
    );
    const selectMatch = src.match(/\.select\("([^"]+)"\)/);
    assert.ok(selectMatch, "expected media_assets .select(...)");
    const cols = selectMatch![1];
    assert.match(
      cols,
      /^id, preview_url, thumbnail_url, preview_playback, updated_at$/,
    );
    assert.doesNotMatch(cols, /master_/);
  });
});

describe("storefront media allowlist", () => {
  it("blocks masters and signed storage URLs", () => {
    assert.equal(
      isAllowedStorefrontMediaUrl("media-masters/x/y/master.mp4"),
      false,
    );
    assert.equal(
      isAllowedStorefrontMediaUrl(
        "https://x.supabase.co/storage/v1/object/sign/media-masters/a?token=t",
      ),
      false,
    );
  });

  it("allows approved previews and site assets", () => {
    assert.equal(
      isAllowedStorefrontMediaUrl(
        "https://x.supabase.co/storage/v1/object/public/media-previews/a/b/preview.mp4",
      ),
      true,
    );
    assert.equal(isAllowedStorefrontMediaUrl("/media/videos/neon.jpg"), true);
  });
});

describe("tools import SSRF", () => {
  it("blocks private targets", () => {
    assert.ok(assertSafeOutboundUrl("http://127.0.0.1/"));
    assert.ok(assertSafeOutboundUrl("http://169.254.169.254/"));
    assert.equal(assertSafeOutboundUrl("https://example.com/ok"), null);
  });
});

describe("security migration guarantees", () => {
  const mig = readFileSync(
    join(
      root,
      "supabase/migrations/20261027000000_security_media_assets_and_storage.sql",
    ),
    "utf8",
  );

  it("is non-destructive", () => {
    const code = mig
      .split("\n")
      .filter((line) => !/^\s*--/.test(line))
      .join("\n");
    assert.doesNotMatch(code, /\bDROP\s+TABLE\b/i);
    assert.doesNotMatch(code, /\bTRUNCATE\b/i);
    assert.doesNotMatch(code, /\bDELETE\s+FROM\b/i);
  });

  it("requires Phase A helpers and locks masters", () => {
    assert.match(mig, /to_regprocedure\('public\.is_admin\(\)'\)/);
    assert.match(mig, /to_regprocedure\('public\.set_updated_at\(\)'\)/);
    assert.match(mig, /AS RESTRICTIVE/);
    assert.match(mig, /media_masters_restrict_anon/);
    assert.match(mig, /media-previews/);
    assert.match(mig, /GRANT SELECT ON public\.catalog_products/);
  });

  it("adds columns additively for existing media_assets", () => {
    assert.match(mig, /ADD COLUMN IF NOT EXISTS master_path/);
    assert.match(mig, /CREATE TABLE IF NOT EXISTS public\.media_assets/);
  });

  it("runs policy and bucket updates inside one top-level transaction", () => {
    const codeLines = mig
      .split("\n")
      .filter((line) => !/^\s*--/.test(line))
      .map((line) => line.trim())
      .filter(Boolean);
    const beginIdx = codeLines.findIndex((line) => /^BEGIN\s*;?\s*$/i.test(line));
    const commitIdx = codeLines.findIndex((line) =>
      /^COMMIT\s*;?\s*$/i.test(line),
    );
    assert.ok(beginIdx >= 0, "expected top-level BEGIN");
    assert.ok(commitIdx > beginIdx, "expected top-level COMMIT after BEGIN");
    const body = codeLines.slice(beginIdx + 1, commitIdx).join("\n");
    assert.match(body, /DROP POLICY IF EXISTS media_masters_restrict_anon/);
    assert.match(body, /CREATE POLICY media_masters_restrict_anon/);
    assert.match(body, /DROP POLICY IF EXISTS media_previews_public_select/);
    assert.match(body, /CREATE POLICY media_previews_public_select/);
    assert.match(body, /INSERT INTO storage\.buckets/);
    assert.match(body, /GRANT SELECT ON public\.catalog_products/);
  });
});

describe("secrets stay server-only in client entrypoints", () => {
  it("browser supabase client has no service role", () => {
    const src = readFileSync(
      join(root, "src/lib/supabase/client.ts"),
      "utf8",
    );
    assert.doesNotMatch(src, /SERVICE_ROLE/);
    assert.doesNotMatch(src, /ADMIN_API_SECRET/);
    assert.doesNotMatch(src, /WORKER_SHARED_SECRET/);
  });
});
