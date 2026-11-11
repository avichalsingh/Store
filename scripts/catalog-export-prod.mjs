#!/usr/bin/env node
/**
 * Read-only Production catalogue export.
 *
 * Usage:
 *   node scripts/catalog-export-prod.mjs --out artifacts/catalog/prod-export.json
 *
 * Env (defaults load from .env.local, override with --env-file):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Safety:
 * - SELECT only; never INSERT/UPDATE/DELETE/Storage writes.
 * - Never exports orders, entitlements, payment_events, or auth users.
 * - Never prints secret values (project ref / host only).
 */

import {
  CATALOG_TABLES,
  FORBIDDEN_TABLES,
  collectPreviewObjectsFromCatalog,
  collectUrlFieldsFromRow,
  createServiceClientFromEnv,
  loadEnvFile,
  parseArgs,
  fetchAllRows,
  projectRefFromUrl,
  transformStorageUrl,
  writeJson,
} from "./lib/catalog-transfer.mjs";

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) {
    console.log(`Read-only Production catalogue export.

  node scripts/catalog-export-prod.mjs --out artifacts/catalog/prod-export.json
  node scripts/catalog-export-prod.mjs --env-file .env.local --out ...

Never writes to the database. Forbidden tables: ${FORBIDDEN_TABLES.join(", ")}`);
    process.exit(0);
  }

  const envFile = opts["env-file"] || ".env.local";
  loadEnvFile(envFile, { override: true });

  const outPath = opts.out || "artifacts/catalog/prod-export.json";
  const { client, url, ref } = createServiceClientFromEnv("production");

  console.log("catalog-export-prod: READ-ONLY export starting");
  console.log(`  envFile=${envFile}`);
  console.log(`  projectRef=${ref}`);
  console.log(`  host=${new URL(url).host}`);
  console.log(`  out=${outPath}`);

  const tables = {};
  const counts = {};
  for (const table of CATALOG_TABLES) {
    const rows = await fetchAllRows(client, table);
    tables[table] = rows;
    counts[table] = rows.length;
    console.log(`  exported ${table}: ${rows.length}`);
  }

  // Media reference analysis (no secret/URL dump — kinds + counts only)
  const urlKinds = {};
  const blocking = [];
  for (const table of CATALOG_TABLES) {
    for (const row of tables[table]) {
      for (const refUrl of collectUrlFieldsFromRow(table, row)) {
        if (refUrl.isPath) {
          urlKinds.bucket_or_path = (urlKinds.bucket_or_path || 0) + 1;
          continue;
        }
        const t = transformStorageUrl(refUrl.value, {
          productionRef: ref,
          stagingRef: "staging-placeholder",
          stagingUrl: "https://staging-placeholder.supabase.co",
        });
        urlKinds[t.kind] = (urlKinds[t.kind] || 0) + 1;
        if (t.kind === "unresolved_supabase" || t.kind === "other_project_supabase") {
          blocking.push({
            table,
            id: row.id ?? null,
            field: refUrl.field,
            kind: t.kind,
          });
        }
      }
    }
  }

  const previewObjects = collectPreviewObjectsFromCatalog(tables);
  const masterPathCount = (tables.media_assets || []).filter(
    (r) => typeof r.master_path === "string" && r.master_path.trim(),
  ).length;

  const manifest = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: {
      projectRef: ref,
      host: new URL(url).host,
      envFile,
      readOnly: true,
    },
    exclusions: [...FORBIDDEN_TABLES],
    tables: CATALOG_TABLES,
    counts,
    media: {
      previewObjectCount: previewObjects.length,
      previewObjects, // paths only (bucket + path), needed by copy-previews
      mediaAssetsWithMasterPath: masterPathCount,
      urlKindCounts: urlKinds,
      unresolvedOrForeignSupabaseRefs: blocking,
    },
    data: tables,
  };

  writeJson(outPath, manifest);
  console.log("catalog-export-prod: wrote manifest (includes row payloads)");
  console.log(
    `  previewObjects=${previewObjects.length} masterPathRows=${masterPathCount}`,
  );
  if (blocking.length) {
    console.warn(
      `  WARNING: ${blocking.length} unresolved/foreign Supabase URL refs — import will block until fixed`,
    );
  }
  console.log("DONE (read-only)");
}

main().catch((err) => {
  console.error("catalog-export-prod FAILED:", err.message || err);
  process.exit(1);
});
