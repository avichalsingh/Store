#!/usr/bin/env node
/**
 * Staging catalogue import from an export manifest.
 *
 * Default: DRY-RUN (no writes).
 *
 * Usage:
 *   node scripts/catalog-import-staging.mjs --in artifacts/catalog/prod-export.json
 *   node scripts/catalog-import-staging.mjs --in ... --execute
 *
 * Env (defaults load from .env.staging):
 *   NEXT_PUBLIC_SUPABASE_URL          # MUST be staging
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   CATALOG_PRODUCTION_PROJECT_REF    # default: source.projectRef from manifest
 *
 * Safety:
 * - Refuses if destination project ref equals production ref.
 * - Never connects using Production credentials for writes.
 * - Aborts on ID conflicts (existing staging rows with same PK).
 * - Never imports forbidden commerce/auth tables.
 * - Rewrites Production storage URLs; blocks if unresolved prod hosts remain.
 */

import {
  CATALOG_TABLES,
  FORBIDDEN_TABLES,
  assertStagingDestination,
  createServiceClientFromEnv,
  loadEnvFile,
  parseArgs,
  projectRefFromUrl,
  readJson,
  transformRowUrls,
} from "./lib/catalog-transfer.mjs";

async function existingIds(client, table) {
  const { data, error } = await client.from(table).select("id");
  if (error) {
    // Composite PK tables
    if (table === "collection_products") {
      const res = await client
        .from(table)
        .select("collection_id,product_id");
      if (res.error) throw new Error(`${table}: ${res.error.message}`);
      return new Set(
        (res.data || []).map((r) => `${r.collection_id}::${r.product_id}`),
      );
    }
    if (table === "collection_character_rules") {
      const res = await client
        .from(table)
        .select("collection_id,character_id");
      if (res.error) throw new Error(`${table}: ${res.error.message}`);
      return new Set(
        (res.data || []).map((r) => `${r.collection_id}::${r.character_id}`),
      );
    }
    throw new Error(`${table}: ${error.message}`);
  }
  return new Set((data || []).map((r) => r.id));
}

function rowKey(table, row) {
  if (table === "collection_products") {
    return `${row.collection_id}::${row.product_id}`;
  }
  if (table === "collection_character_rules") {
    return `${row.collection_id}::${row.character_id}`;
  }
  return row.id;
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) {
    console.log(`Import catalogue into Staging (dry-run by default).

  node scripts/catalog-import-staging.mjs --in artifacts/catalog/prod-export.json
  node scripts/catalog-import-staging.mjs --in ... --execute

Forbidden tables: ${FORBIDDEN_TABLES.join(", ")}`);
    process.exit(0);
  }

  const execute = flags.has("execute");
  const envFile = opts["env-file"] || ".env.staging";
  const inPath = opts.in;
  if (!inPath) {
    throw new Error("Missing --in <export-manifest.json>");
  }

  // Load staging env only (override) — never silently fall back to .env.local.
  loadEnvFile(envFile, { override: true });
  const staging = createServiceClientFromEnv("staging");

  const manifest = readJson(inPath);
  if (!manifest?.data || !manifest?.source?.projectRef) {
    throw new Error("Invalid manifest: expected source.projectRef and data");
  }

  const productionRef =
    process.env.CATALOG_PRODUCTION_PROJECT_REF?.trim() ||
    manifest.source.projectRef;

  assertStagingDestination(staging.ref, productionRef);

  console.log("catalog-import-staging:", execute ? "EXECUTE" : "DRY-RUN");
  console.log(`  envFile=${envFile}`);
  console.log(`  stagingRef=${staging.ref}`);
  console.log(`  productionRef=${productionRef}`);
  console.log(`  manifestSourceRef=${manifest.source.projectRef}`);
  console.log(`  host=${new URL(staging.url).host}`);

  if (staging.ref === manifest.source.projectRef) {
    throw new Error(
      "Refusing: staging env points at the same project that produced the export",
    );
  }

  const plan = {
    mode: execute ? "execute" : "dry-run",
    tables: {},
    urlTransform: { changed: 0, blocking: 0, kinds: {} },
    conflicts: [],
    inserts: {},
  };

  const transformed = {};
  for (const table of CATALOG_TABLES) {
    const rows = manifest.data[table] || [];
    const outRows = [];
    for (const row of rows) {
      const { row: next, report } = transformRowUrls(table, row, {
        productionRef,
        stagingRef: staging.ref,
        stagingUrl: staging.url,
      });
      for (const r of report) {
        plan.urlTransform.kinds[r.fromKind] =
          (plan.urlTransform.kinds[r.fromKind] || 0) + 1;
        if (r.changed) plan.urlTransform.changed += 1;
        if (r.blocking) {
          plan.urlTransform.blocking += 1;
          plan.conflicts.push({
            type: "blocking_url",
            table,
            id: row.id ?? null,
            kind: r.fromKind,
            host: r.sampleHost,
          });
        }
        if (r.fromKind === "master_url_skipped") {
          plan.conflicts.push({
            type: "master_url_present",
            table,
            id: row.id ?? null,
            note: "Master storage URLs are not rewritten; masters are not copied in this phase",
          });
        }
      }
      outRows.push(next);
    }
    transformed[table] = outRows;
  }

  if (plan.urlTransform.blocking > 0) {
    console.error(
      `BLOCKED: ${plan.urlTransform.blocking} unresolved Production/foreign Supabase URLs`,
    );
    console.error(JSON.stringify(plan.conflicts.filter((c) => c.type === "blocking_url"), null, 2));
    process.exit(2);
  }

  // Conflict detection against destination
  for (const table of CATALOG_TABLES) {
    let existing;
    try {
      existing = await existingIds(staging.client, table);
    } catch (err) {
      console.error(
        `Cannot read staging.${table} (often missing service_role grants):`,
        err.message,
      );
      process.exit(3);
    }

    const incoming = transformed[table];
    const conflictIds = [];
    const insertRows = [];
    for (const row of incoming) {
      const key = rowKey(table, row);
      if (existing.has(key)) conflictIds.push(key);
      else insertRows.push(row);
    }
    plan.tables[table] = {
      incoming: incoming.length,
      existing: existing.size,
      wouldInsert: insertRows.length,
      conflicts: conflictIds.length,
    };
    plan.inserts[table] = insertRows;
    if (conflictIds.length) {
      plan.conflicts.push({
        type: "id_conflict",
        table,
        sampleIds: conflictIds.slice(0, 10),
        total: conflictIds.length,
      });
    }
    console.log(
      `  ${table}: incoming=${incoming.length} existing=${existing.size} insert=${insertRows.length} conflicts=${conflictIds.length}`,
    );
  }

  const idConflicts = plan.conflicts.filter((c) => c.type === "id_conflict");
  if (idConflicts.length) {
    console.error("BLOCKED: ID conflicts on staging — refusing to overwrite");
    console.error(JSON.stringify(idConflicts, null, 2));
    process.exit(4);
  }

  console.log("URL transform kinds:", plan.urlTransform.kinds);
  console.log(`URL values rewritten: ${plan.urlTransform.changed}`);

  if (!execute) {
    console.log("DRY-RUN complete — no rows written");
    console.log("Re-run with --execute after human approval to apply inserts");
    process.exit(0);
  }

  // EXECUTE path — insert only (no upsert overwrite)
  for (const table of CATALOG_TABLES) {
    const rows = plan.inserts[table];
    if (!rows.length) {
      console.log(`  skip ${table} (0 inserts)`);
      continue;
    }
    const chunk = 200;
    for (let i = 0; i < rows.length; i += chunk) {
      const slice = rows.slice(i, i + chunk);
      const { error } = await staging.client.from(table).insert(slice);
      if (error) {
        throw new Error(`Insert ${table} failed: ${error.message}`);
      }
    }
    console.log(`  inserted ${table}: ${rows.length}`);
  }

  console.log("EXECUTE complete");
}

main().catch((err) => {
  console.error("catalog-import-staging FAILED:", err.message || err);
  process.exit(1);
});
