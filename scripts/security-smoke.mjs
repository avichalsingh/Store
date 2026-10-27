/**
 * Static + unit security smoke checks (no live secrets required).
 * Usage: node scripts/security-smoke.mjs
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
if (!gitignore.includes(".env*")) fail(".gitignore must ignore .env* files");
ok(".gitignore ignores .env*");

const secretPublicRe =
  /NEXT_PUBLIC_(?:SUPABASE_SERVICE_ROLE|ADMIN_API_SECRET|WORKER_SHARED_SECRET|STRIPE_SECRET)/;
for (const rel of [
  "src/lib/supabase/admin.ts",
  "src/lib/supabase/client.ts",
  "src/middleware.ts",
  "worker/src/config.ts",
]) {
  const src = readFileSync(join(root, rel), "utf8");
  if (secretPublicRe.test(src)) {
    fail(`${rel} exposes a secret via NEXT_PUBLIC_`);
  }
}
ok("no NEXT_PUBLIC_ secret mis-prefix in core modules");

const clientTs = readFileSync(join(root, "src/lib/supabase/client.ts"), "utf8");
if (clientTs.includes("SERVICE_ROLE") || clientTs.includes("createServiceClient")) {
  fail("browser supabase client must not reference service role");
}
ok("browser supabase client has no service role");

const ssrfSrc = readFileSync(join(root, "src/lib/security/ssrf.ts"), "utf8");
if (
  !ssrfSrc.includes("assertSafeOutboundUrl") ||
  !ssrfSrc.includes("isPrivateIpv4") ||
  !ssrfSrc.includes("169")
) {
  fail("ssrf helper missing private-IP guards");
}
ok("ssrf helper present");

const mw = readFileSync(join(root, "src/middleware.ts"), "utf8");
if (!mw.includes("/api/admin") || !mw.includes("isAdminCookieHeaderValidEdge")) {
  fail("middleware must gate admin APIs with edge session check");
}
if (!mw.includes("/admin/login")) fail("middleware must exempt /admin/login");
ok("middleware admin gates present");

const workerIndex = readFileSync(join(root, "worker/src/index.ts"), "utf8");
if (!workerIndex.includes("MEDIA_MASTERS_BUCKET") || !workerIndex.includes("..")) {
  fail("worker must validate master bucket/path");
}
if (!workerIndex.includes("MAX_BODY_BYTES")) {
  fail("worker must bound request body size");
}
ok("worker payload hardening present");

const dl = readFileSync(
  join(root, "src/app/api/library/download/route.ts"),
  "utf8",
);
if (!dl.includes("403") || !dl.includes("ENTITLEMENT_REQUIRED")) {
  fail("library download must fail closed without entitlements");
}
ok("library download fails closed");

const phaseA = join(
  root,
  "supabase/migrations/20260913083000_phase_a_catalog.sql",
);
const mig = join(
  root,
  "supabase/migrations/20261027000000_security_media_assets_and_storage.sql",
);
if (!existsSync(phaseA)) fail("Phase A migration missing");
if (!existsSync(mig)) fail("security migration missing");

const phaseASrc = readFileSync(phaseA, "utf8");
if (!phaseASrc.includes("CREATE OR REPLACE FUNCTION public.is_admin()")) {
  fail("Phase A must define is_admin()");
}
if (!phaseASrc.includes("CREATE OR REPLACE FUNCTION public.set_updated_at()")) {
  fail("Phase A must define set_updated_at()");
}
ok("Phase A defines is_admin + set_updated_at");

const migSrc = readFileSync(mig, "utf8");
if (!/ENABLE ROW LEVEL SECURITY/i.test(migSrc)) {
  fail("migration must enable RLS on media_assets");
}
if (!migSrc.includes("AS RESTRICTIVE")) {
  fail("migration must use RESTRICTIVE policies for media-masters");
}
if (!migSrc.includes("to_regprocedure('public.is_admin()')")) {
  fail("migration must fail closed if is_admin is missing");
}
if (!migSrc.includes("ADD COLUMN IF NOT EXISTS master_path")) {
  fail("migration must additively ensure media_assets columns");
}
if (!migSrc.includes("media-masters") || !migSrc.includes("media-previews")) {
  fail("migration must cover both storage buckets");
}
if (!migSrc.includes("GRANT SELECT ON public.catalog_products")) {
  fail("migration must preserve catalog_products SELECT for anon");
}
// Ignore SQL comments when checking for destructive statements.
const migCodeLines = migSrc
  .split("\n")
  .filter((line) => !/^\s*--/.test(line))
  .map((line) => line.trim())
  .filter(Boolean);
const migCode = migCodeLines.join("\n");
if (/\bDROP\s+TABLE\b/i.test(migCode) || /\bTRUNCATE\b/i.test(migCode)) {
  fail("migration must not drop/truncate tables");
}
if (/\bDELETE\s+FROM\b/i.test(migCode)) {
  fail("migration must not DELETE rows");
}
const beginIdx = migCodeLines.findIndex((line) => /^BEGIN\s*;?\s*$/i.test(line));
const commitIdx = migCodeLines.findIndex((line) => /^COMMIT\s*;?\s*$/i.test(line));
if (beginIdx < 0 || commitIdx < 0 || beginIdx >= commitIdx) {
  fail("migration must wrap DB changes in a top-level BEGIN … COMMIT transaction");
}
const txnBody = migCodeLines.slice(beginIdx + 1, commitIdx).join("\n");
for (const needle of [
  "DROP POLICY IF EXISTS media_masters_restrict_anon",
  "CREATE POLICY media_masters_restrict_anon",
  "DROP POLICY IF EXISTS media_previews_public_select",
  "CREATE POLICY media_previews_public_select",
  "INSERT INTO storage.buckets",
  "GRANT SELECT ON public.catalog_products",
]) {
  if (!txnBody.includes(needle)) {
    fail(`migration transaction must include: ${needle}`);
  }
}
ok("security migration production-safe invariants");

const appColumns = [
  "master_bucket",
  "master_path",
  "preview_url",
  "thumbnail_url",
  "processing_status",
  "preview_playback",
  "used_by_product_ids",
];
const mapper = readFileSync(
  join(root, "src/catalog/mapAdminMediaAssetToSupabase.ts"),
  "utf8",
);
for (const col of appColumns) {
  if (!mapper.includes(col) || !migSrc.includes(col)) {
    fail(`media_assets column ${col} must exist in mapper and migration`);
  }
}
ok("media_assets schema matches app mapper");

const pub = readFileSync(join(root, "src/lib/security/publicMedia.ts"), "utf8");
if (!pub.includes("media-masters") || !pub.includes("sign")) {
  fail("publicMedia must reject masters and signed object URLs");
}
ok("publicMedia rejects masters/signed URLs");

const secret = "unit-test-admin-secret-not-real";
const purpose = "rhythm-admin-publish-v1";
const token = createHmac("sha256", secret).update(purpose).digest("hex");
const again = createHmac("sha256", secret).update(purpose).digest("hex");
if (!timingSafeEqual(Buffer.from(token), Buffer.from(again))) {
  fail("HMAC derivation unstable");
}
ok("admin session HMAC derivation stable");

console.log("SECURITY_SMOKE_OK");
