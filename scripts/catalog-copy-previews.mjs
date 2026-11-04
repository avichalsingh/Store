#!/usr/bin/env node
/**
 * Selective media-previews object copy Production → Staging.
 *
 * Default: DRY-RUN (lists objects; no download/upload).
 *
 * Usage:
 *   node scripts/catalog-copy-previews.mjs --in artifacts/catalog/prod-export.json
 *   node scripts/catalog-copy-previews.mjs --in ... --prod-env .env.local --staging-env .env.staging --execute
 *
 * Safety:
 * - Copies ONLY media-previews objects referenced by the manifest.
 * - Never copies media-masters (bulk or selective) in this phase.
 * - Aborts if staging ref equals production ref.
 * - Missing source objects are reported; use --skip-missing to continue (still no masters).
 */

import {
  MASTER_BUCKET,
  PREVIEW_BUCKET,
  assertStagingDestination,
  createServiceClientFromEnv,
  loadEnvFile,
  parseArgs,
  readJson,
} from "./lib/catalog-transfer.mjs";

async function downloadPreview(client, path) {
  const { data, error } = await client.storage
    .from(PREVIEW_BUCKET)
    .download(path);
  if (error) return { ok: false, error: error.message };
  const buf = Buffer.from(await data.arrayBuffer());
  return { ok: true, buf, contentType: data.type || undefined };
}

async function uploadPreview(client, path, buf, contentType) {
  const { error } = await client.storage.from(PREVIEW_BUCKET).upload(path, buf, {
    upsert: false,
    contentType: contentType || undefined,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function existsOnStaging(client, path) {
  const dir = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
  const name = path.split("/").pop();
  const { data, error } = await client.storage.from(PREVIEW_BUCKET).list(dir, {
    search: name,
    limit: 100,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, exists: (data || []).some((f) => f.name === name) };
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) {
    console.log(`Copy referenced media-previews objects to Staging (dry-run default).

  node scripts/catalog-copy-previews.mjs --in artifacts/catalog/prod-export.json
  node scripts/catalog-copy-previews.mjs --in ... --execute

Never copies ${MASTER_BUCKET}.`);
    process.exit(0);
  }

  const execute = flags.has("execute");
  const skipMissing = flags.has("skip-missing");
  const inPath = opts.in;
  if (!inPath) throw new Error("Missing --in <export-manifest.json>");

  const prodEnvFile = opts["prod-env"] || ".env.local";
  const stagingEnvFile = opts["staging-env"] || ".env.staging";

  // Production client (read storage only)
  loadEnvFile(prodEnvFile, { override: true });
  const production = createServiceClientFromEnv("production");

  // Staging client — reload staging env over process.env
  loadEnvFile(stagingEnvFile, { override: true });
  const staging = createServiceClientFromEnv("staging");

  assertStagingDestination(staging.ref, production.ref);

  const manifest = readJson(inPath);
  const objects = manifest?.media?.previewObjects || [];
  if (!Array.isArray(objects)) {
    throw new Error("Manifest missing media.previewObjects[]");
  }

  // Hard reject any master bucket entries if present
  const masters = objects.filter((o) => o.bucket === MASTER_BUCKET);
  if (masters.length) {
    throw new Error(
      `Refusing: manifest lists ${masters.length} ${MASTER_BUCKET} objects`,
    );
  }

  console.log("catalog-copy-previews:", execute ? "EXECUTE" : "DRY-RUN");
  console.log(`  productionRef=${production.ref}`);
  console.log(`  stagingRef=${staging.ref}`);
  console.log(`  previewObjects=${objects.length}`);

  const plan = {
    wouldCopy: 0,
    alreadyOnStaging: 0,
    missingSource: [],
    errors: [],
  };

  for (const obj of objects) {
    if (obj.bucket !== PREVIEW_BUCKET) {
      plan.errors.push({ path: obj.path, error: `unexpected bucket ${obj.bucket}` });
      continue;
    }

    // Probe source
    const src = await downloadPreview(production.client, obj.path);
    if (!src.ok) {
      plan.missingSource.push({ path: obj.path, error: src.error });
      continue;
    }

    const dest = await existsOnStaging(staging.client, obj.path);
    if (!dest.ok) {
      plan.errors.push({ path: obj.path, error: dest.error });
      continue;
    }
    if (dest.exists) {
      plan.alreadyOnStaging += 1;
      continue;
    }

    plan.wouldCopy += 1;
    if (!execute) continue;

    const up = await uploadPreview(
      staging.client,
      obj.path,
      src.buf,
      src.contentType,
    );
    if (!up.ok) {
      plan.errors.push({ path: obj.path, error: up.error });
    }
  }

  console.log(`  wouldCopy=${plan.wouldCopy}`);
  console.log(`  alreadyOnStaging=${plan.alreadyOnStaging}`);
  console.log(`  missingSource=${plan.missingSource.length}`);
  console.log(`  errors=${plan.errors.length}`);
  if (plan.missingSource.length) {
    console.warn(
      "Missing source preview objects:",
      plan.missingSource.slice(0, 20),
    );
  }
  if (plan.errors.length) {
    console.error("Errors:", plan.errors.slice(0, 20));
  }

  if (plan.missingSource.length && !skipMissing && execute) {
    throw new Error(
      "Aborting execute: missing source objects (pass --skip-missing to allow partial copy)",
    );
  }

  if (!execute) {
    console.log("DRY-RUN complete — no storage objects copied");
    console.log("Re-run with --execute after human approval");
    process.exit(plan.errors.length ? 1 : 0);
  }

  console.log("EXECUTE complete (media-previews only)");
}

main().catch((err) => {
  console.error("catalog-copy-previews FAILED:", err.message || err);
  process.exit(1);
});
