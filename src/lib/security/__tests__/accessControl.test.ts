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
  it("library download is auth + entitlement gated before signing", () => {
    const src = readFileSync(
      join(root, "src/app/api/library/download/route.ts"),
      "utf8",
    );
    const helper = readFileSync(
      join(root, "src/lib/commerce/download.ts"),
      "utf8",
    );
    assert.match(src, /AUTH_REQUIRED|getUser/);
    assert.match(src, /createEntitledMasterDownload/);
    assert.match(helper, /ENTITLEMENT_REQUIRED/);
    assert.match(helper, /createSignedUrl/);
    assert.doesNotMatch(src, /master_path/);
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

  it("gates customer account, checkout, and library behind Supabase Auth", () => {
    const src = readFileSync(join(root, "src/middleware.ts"), "utf8");
    assert.match(src, /requiresCustomerAuth/);
    assert.match(src, /\/signin/);
    assert.match(src, /\/account/);
    assert.match(src, /\/checkout/);
    assert.match(src, /\/library\//);
  });
});

describe("CSP allows Razorpay Checkout without blanket wildcards", () => {
  it("includes Razorpay hosts in script-src, frame-src, and connect-src", async () => {
    const { SECURITY_HEADERS } = await import("../headers");
    const csp = SECURITY_HEADERS["Content-Security-Policy"];
    assert.match(csp, /script-src[^;]*https:\/\/\*\.razorpay\.com/);
    assert.match(csp, /frame-src[^;]*https:\/\/\*\.razorpay\.com/);
    assert.match(csp, /connect-src[^;]*https:\/\/\*\.razorpay\.com/);
    // No scheme-wide / universal script allowlist.
    assert.doesNotMatch(csp, /script-src[^;]* https:(;|$)/);
    assert.doesNotMatch(csp, /script-src[^;]* \*(;|$)/);
  });
});

describe("COOP allows Razorpay bank-auth popups on checkout-flow documents", () => {
  it("relaxes COOP on /, /signin, /cart, /checkout and keeps same-origin elsewhere", async () => {
    const {
      COOP_CHECKOUT,
      COOP_DEFAULT,
      SECURITY_HEADERS,
      applySecurityHeaders,
      isCheckoutFlowDocumentPath,
      resolveCrossOriginOpenerPolicy,
    } = await import("../headers");

    assert.equal(COOP_DEFAULT, "same-origin");
    assert.equal(COOP_CHECKOUT, "same-origin-allow-popups");
    assert.equal(
      SECURITY_HEADERS["Cross-Origin-Opener-Policy"],
      "same-origin",
    );

    // Pathname resolver receives pathname only (no query); cover real route shapes.
    for (const pathname of [
      "/",
      "/signin",
      "/cart",
      "/cart/",
      "/checkout",
      "/checkout/",
    ]) {
      assert.equal(isCheckoutFlowDocumentPath(pathname), true, pathname);
      assert.equal(
        resolveCrossOriginOpenerPolicy(pathname),
        COOP_CHECKOUT,
        pathname,
      );
      const headers = new Headers();
      applySecurityHeaders(headers, { pathname });
      assert.equal(
        headers.get("Cross-Origin-Opener-Policy"),
        "same-origin-allow-popups",
        pathname,
      );
      // CSP must remain intact when COOP is overridden for checkout flow.
      assert.match(
        headers.get("Content-Security-Policy") || "",
        /https:\/\/\*\.razorpay\.com/,
      );
    }

    const retainDefaultPaths = [
      "/account",
      "/admin",
      "/admin/login",
      "/videos",
      "/api/checkout/create-order",
      "/api/catalog",
      "/library/foo",
    ];
    for (const pathname of retainDefaultPaths) {
      assert.equal(isCheckoutFlowDocumentPath(pathname), false, pathname);
      assert.equal(
        resolveCrossOriginOpenerPolicy(pathname),
        COOP_DEFAULT,
        pathname,
      );
      const headers = new Headers();
      applySecurityHeaders(headers, { pathname });
      assert.equal(
        headers.get("Cross-Origin-Opener-Policy"),
        "same-origin",
        pathname,
      );
    }
  });

  it("middleware applies security headers with pathname for COOP scoping", () => {
    const src = readFileSync(join(root, "src/middleware.ts"), "utf8");
    assert.match(src, /applySecurityHeaders\([^,]+,\s*\{\s*pathname\s*\}/);
    assert.match(src, /withSecurityHeaders\([^,]+,\s*pathname\)/);
    assert.doesNotMatch(src, /Cross-Origin-Embedder-Policy/);
  });
});

describe("auth callback", () => {
  it("exchanges PKCE code and verifies email OTP token_hash safely", () => {
    const src = readFileSync(
      join(root, "src/app/auth/callback/route.ts"),
      "utf8",
    );
    assert.match(src, /exchangeCodeForSession/);
    assert.match(src, /verifyOtp/);
    assert.match(src, /token_hash/);
    assert.match(src, /safeNextPath/);
    assert.match(src, /\/signin/);
    assert.doesNotMatch(src, /SERVICE_ROLE|createServiceClient/);
  });

  it("checkout returns customers to sign-in with next=/checkout", () => {
    const src = readFileSync(
      join(root, "src/app/(store)/checkout/page.tsx"),
      "utf8",
    );
    assert.match(src, /\/signin\?next=/);
    assert.match(src, /\/checkout/);
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
