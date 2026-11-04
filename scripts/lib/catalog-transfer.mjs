/**
 * Shared helpers for Production → Staging catalogue transfer scripts.
 * Never logs secret values. Never writes when callers stay in dry-run.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

/** Tables that must never be exported or imported. */
export const FORBIDDEN_TABLES = Object.freeze([
  "auth.users",
  "orders",
  "order_items",
  "payment_events",
  "entitlements",
]);

/**
 * Catalogue tables in dependency-safe import order.
 * Join tables after parents; relationships after products; media_assets last
 * (soft-referenced by products.media_asset_id, no FK).
 */
export const CATALOG_TABLES = Object.freeze([
  "characters",
  "products",
  "collections",
  "collection_products",
  "collection_character_rules",
  "product_relationships",
  "media_assets",
]);

export const PREVIEW_BUCKET = "media-previews";
export const MASTER_BUCKET = "media-masters";

const STORAGE_PUBLIC_RE =
  /^https:\/\/([a-z0-9]+)\.supabase\.co\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/i;
const STORAGE_SIGN_RE =
  /^https:\/\/([a-z0-9]+)\.supabase\.co\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/i;

export function loadEnvFile(filePath, { override = false } = {}) {
  const path = resolve(process.cwd(), filePath);
  if (!existsSync(path)) {
    throw new Error(`Env file not found: ${filePath}`);
  }
  const text = readFileSync(path, "utf8");
  const loaded = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (override || !process.env[key]) {
      process.env[key] = value;
    }
    loaded[key] = Boolean(value);
  }
  return loaded;
}

export function projectRefFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  try {
    const host = new URL(url).hostname;
    const m = /^([a-z0-9]+)\.supabase\.co$/i.exec(host);
    return m ? m[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

export function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function createServiceClientFromEnv(label) {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ref = projectRefFromUrl(url);
  if (!ref) {
    throw new Error(`${label}: NEXT_PUBLIC_SUPABASE_URL is not a supabase.co URL`);
  }
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, url, ref, label };
}

/** Fail closed if a write-capable destination looks like Production. */
export function assertStagingDestination(stagingRef, productionRef) {
  if (!stagingRef) throw new Error("Staging project ref missing");
  if (!productionRef) throw new Error("Production project ref missing for comparison");
  if (stagingRef === productionRef) {
    throw new Error(
      "Refusing: staging URL resolves to the same project ref as production",
    );
  }
}

export function assertAllowedTable(name) {
  if (FORBIDDEN_TABLES.includes(name)) {
    throw new Error(`Refusing forbidden table: ${name}`);
  }
  if (!CATALOG_TABLES.includes(name)) {
    throw new Error(`Refusing unknown catalogue table: ${name}`);
  }
}

/**
 * Rewrite Production public/signed storage URLs to Staging public URLs.
 * Relative paths and non-Supabase URLs are left unchanged (reported separately).
 */
export function transformStorageUrl(value, { productionRef, stagingRef, stagingUrl }) {
  if (typeof value !== "string" || !value.trim()) {
    return { value, kind: "empty", changed: false };
  }
  const raw = value.trim();

  if (raw.startsWith("/") && !raw.startsWith("//")) {
    return { value: raw, kind: "relative", changed: false };
  }
  if (
    raw.startsWith(`${PREVIEW_BUCKET}/`) ||
    raw.startsWith(`${MASTER_BUCKET}/`)
  ) {
    return { value: raw, kind: "bucket_path", changed: false };
  }

  let match = STORAGE_PUBLIC_RE.exec(raw);
  let signed = false;
  if (!match) {
    match = STORAGE_SIGN_RE.exec(raw);
    signed = Boolean(match);
  }
  if (!match) {
    if (/supabase\.co/i.test(raw)) {
      return { value: raw, kind: "unresolved_supabase", changed: false };
    }
    if (/^https?:\/\//i.test(raw)) {
      return { value: raw, kind: "external", changed: false };
    }
    return { value: raw, kind: "other", changed: false };
  }

  const [, ref, bucket, objectPathWithQuery] = match;
  const objectPath = objectPathWithQuery.split("?")[0];
  if (ref.toLowerCase() !== productionRef.toLowerCase()) {
    return { value: raw, kind: "other_project_supabase", changed: false };
  }
  if (bucket === MASTER_BUCKET) {
    return { value: raw, kind: "master_url_skipped", changed: false, bucket, objectPath };
  }
  if (bucket !== PREVIEW_BUCKET) {
    return { value: raw, kind: "unresolved_bucket", changed: false, bucket, objectPath };
  }

  const stagingOrigin = stagingUrl.replace(/\/$/, "");
  // Signed prod URLs become public staging preview URLs (previews bucket is public).
  const next = `${stagingOrigin}/storage/v1/object/public/${PREVIEW_BUCKET}/${objectPath}`;
  return {
    value: next,
    kind: signed ? "rewritten_from_signed" : "rewritten_public",
    changed: true,
    bucket,
    objectPath,
  };
}

function walkStrings(node, visit) {
  if (typeof node === "string") {
    visit(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, visit);
    return;
  }
  if (node && typeof node === "object") {
    for (const v of Object.values(node)) walkStrings(v, visit);
  }
}

function mapStrings(node, mapFn) {
  if (typeof node === "string") return mapFn(node);
  if (Array.isArray(node)) return node.map((item) => mapStrings(item, mapFn));
  if (node && typeof node === "object") {
    const out = Array.isArray(node) ? [] : { ...node };
    for (const [k, v] of Object.entries(node)) {
      out[k] = mapStrings(v, mapFn);
    }
    return out;
  }
  return node;
}

export function collectUrlFieldsFromRow(table, row) {
  const urls = [];
  const consider = (field, value) => {
    if (typeof value === "string" && value.trim()) {
      urls.push({ table, id: row.id ?? null, field, value: value.trim() });
    }
  };

  if (table === "characters") {
    consider("image", row.image);
  }
  if (table === "collections") {
    consider("cover_image", row.cover_image);
    consider("cover_custom_url", row.cover_custom_url);
  }
  if (table === "products") {
    walkStrings(row.media, (s) => consider("media.*", s));
    walkStrings(row.ai_image_data, (s) => consider("ai_image_data.*", s));
  }
  if (table === "media_assets") {
    consider("preview_url", row.preview_url);
    consider("thumbnail_url", row.thumbnail_url);
    if (row.preview_path) {
      urls.push({
        table,
        id: row.id,
        field: "preview_path",
        value: String(row.preview_path),
        isPath: true,
      });
    }
    if (row.thumbnail_path) {
      urls.push({
        table,
        id: row.id,
        field: "thumbnail_path",
        value: String(row.thumbnail_path),
        isPath: true,
      });
    }
  }
  return urls;
}

export function transformRowUrls(table, row, ctx) {
  const report = [];
  const mapOne = (s) => {
    const result = transformStorageUrl(s, ctx);
    report.push({ table, id: row.id ?? null, fromKind: result.kind, changed: result.changed });
    if (result.kind === "unresolved_supabase" || result.kind === "other_project_supabase") {
      report[report.length - 1].blocking = true;
      report[report.length - 1].sampleHost = (() => {
        try {
          return new URL(s).host;
        } catch {
          return "(invalid)";
        }
      })();
    }
    if (result.kind === "master_url_skipped") {
      report[report.length - 1].warning = "master_url_left_as_is_or_blocked";
    }
    return result.value;
  };

  let next = { ...row };
  if (table === "characters" && typeof next.image === "string") {
    next.image = mapOne(next.image);
  }
  if (table === "collections") {
    if (typeof next.cover_image === "string") next.cover_image = mapOne(next.cover_image);
    if (typeof next.cover_custom_url === "string") {
      next.cover_custom_url = mapOne(next.cover_custom_url);
    }
  }
  if (table === "products") {
    if (next.media != null) next.media = mapStrings(next.media, mapOne);
    if (next.ai_image_data != null) {
      next.ai_image_data = mapStrings(next.ai_image_data, mapOne);
    }
  }
  if (table === "media_assets") {
    if (typeof next.preview_url === "string") next.preview_url = mapOne(next.preview_url);
    if (typeof next.thumbnail_url === "string") {
      next.thumbnail_url = mapOne(next.thumbnail_url);
    }
    // Clear any accidental public master URLs; keep master_path for metadata only.
    // Do not rewrite master_path — masters are not copied in this phase.
  }
  return { row: next, report };
}

export function collectPreviewObjectsFromCatalog(tables) {
  /** @type {Map<string, { bucket: string, path: string, sources: string[] }>} */
  const objects = new Map();
  const add = (path, source) => {
    const clean = String(path || "")
      .replace(/^\/+/, "")
      .split("?")[0];
    if (!clean) return;
    const key = `${PREVIEW_BUCKET}:${clean}`;
    const prev = objects.get(key) || {
      bucket: PREVIEW_BUCKET,
      path: clean,
      sources: [],
    };
    if (!prev.sources.includes(source)) prev.sources.push(source);
    objects.set(key, prev);
  };

  for (const [table, rows] of Object.entries(tables)) {
    for (const row of rows) {
      for (const ref of collectUrlFieldsFromRow(table, row)) {
        if (ref.isPath) {
          add(ref.value, `${table}:${row.id}:${ref.field}`);
          continue;
        }
        const pub = STORAGE_PUBLIC_RE.exec(ref.value);
        const sig = STORAGE_SIGN_RE.exec(ref.value);
        const m = pub || sig;
        if (m && m[2] === PREVIEW_BUCKET) {
          add(m[3], `${table}:${row.id}:${ref.field}`);
        }
      }
      if (table === "media_assets") {
        if (row.preview_bucket === PREVIEW_BUCKET && row.preview_path) {
          add(row.preview_path, `${table}:${row.id}:preview_path`);
        }
        if (row.thumbnail_path) {
          add(row.thumbnail_path, `${table}:${row.id}:thumbnail_path`);
        }
      }
    }
  }
  return [...objects.values()];
}

export function writeJson(filePath, data) {
  const abs = resolve(process.cwd(), filePath);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
  return abs;
}

export function readJson(filePath) {
  const abs = resolve(process.cwd(), filePath);
  return JSON.parse(readFileSync(abs, "utf8"));
}

export function parseArgs(argv) {
  const flags = new Set();
  const opts = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > 0) {
        opts[a.slice(2, eq)] = a.slice(eq + 1);
      } else if (argv[i + 1] && !argv[i + 1].startsWith("--")) {
        opts[a.slice(2)] = argv[++i];
      } else {
        flags.add(a.slice(2));
      }
    }
  }
  return { flags, opts };
}

export async function fetchAllRows(client, table) {
  assertAllowedTable(table);
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await client.from(table).select("*").range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
