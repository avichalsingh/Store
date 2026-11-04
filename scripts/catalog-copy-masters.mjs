#!/usr/bin/env node
/**
 * Selective media-masters object copy Production → Staging.
 *
 * Default: DRY-RUN (Storage list metadata only — no download/upload/delete).
 *
 * Usage:
 *   node scripts/catalog-copy-masters.mjs --in artifacts/catalog/prod-export.json
 *   node scripts/catalog-copy-masters.mjs --in ... --prod-env .env.local --staging-env .env.staging --execute
 *
 * Safety:
 * - Copies ONLY the exact 14 media-masters paths from the export allowlist.
 * - Never copies media-previews.
 * - Never changes bucket visibility or storage policies.
 * - Never deletes Production objects; upload uses upsert: false.
 * - Aborts if staging ref equals production ref.
 * - Aborts if export masters ≠ pinned 14-path allowlist.
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

/**
 * Pinned allowlist from the Production export / Stage-3 audit.
 * All 14 rows with master_path — including unusual statuses and orphans.
 */
export const EXPECTED_MASTER_PATHS = Object.freeze([
  "library/media-3niph6p/master.mp4",
  "library/media-3qs9ej7/master.mp4",
  "library/media-5dhkoex/master.mp4",
  "library/media-c5g1nqx/master.mp4",
  "library/media-e68yasw/master.mp4",
  "library/media-f4dp0dy/master.mp4",
  "library/media-ketf2f1/master.mp4",
  "library/media-mh5ruwb/master.mp4",
  "library/media-s7h48uc/master.mp4",
  "library/media-swjjapb/master.mp4",
  "library/media-xxy4kxy/master.mp4",
  "library/media-zi5zjxj/master.mp4",
  "library/media-zx3m044/master.mp4",
  "vid-phase4-integration/media-phase4-integration/master.mp4",
]);

function deriveMasterObjectsFromExport(manifest) {
  const rows = manifest?.data?.media_assets;
  if (!Array.isArray(rows)) {
    throw new Error("Manifest missing data.media_assets[]");
  }

  const derived = [];
  for (const row of rows) {
    const path = typeof row.master_path === "string" ? row.master_path.trim() : "";
    if (!path) continue;
    const bucket =
      (typeof row.master_bucket === "string" && row.master_bucket.trim()) ||
      MASTER_BUCKET;
    derived.push({
      id: row.id,
      bucket,
      path: path.replace(/^\/+/, ""),
      processing_status: row.processing_status ?? null,
      mime_type: row.mime_type ?? null,
      size_bytes: row.size_bytes ?? null,
      name: row.name ?? null,
    });
  }
  return derived;
}

function assertExactAllowlist(derived) {
  const expected = new Set(EXPECTED_MASTER_PATHS);
  const actual = new Set(derived.map((o) => o.path));

  const missing = [...expected].filter((p) => !actual.has(p)).sort();
  const extra = [...actual].filter((p) => !expected.has(p)).sort();
  const wrongBucket = derived.filter((o) => o.bucket !== MASTER_BUCKET);
  const previewLeak = derived.filter((o) => o.bucket === PREVIEW_BUCKET);

  if (wrongBucket.length || previewLeak.length || missing.length || extra.length) {
    const parts = [];
    if (missing.length) parts.push(`missing paths: ${missing.join(", ")}`);
    if (extra.length) parts.push(`additional paths: ${extra.join(", ")}`);
    if (wrongBucket.length) {
      parts.push(
        `non-master buckets: ${wrongBucket
          .map((o) => `${o.path}→${o.bucket}`)
          .join(", ")}`,
      );
    }
    throw new Error(
      `Allowlist mismatch (expected exactly ${EXPECTED_MASTER_PATHS.length} ${MASTER_BUCKET} paths): ${parts.join("; ")}`,
    );
  }

  if (derived.length !== EXPECTED_MASTER_PATHS.length) {
    throw new Error(
      `Allowlist count mismatch: derived=${derived.length} expected=${EXPECTED_MASTER_PATHS.length}`,
    );
  }

  // Stable order matching pinned allowlist
  const byPath = new Map(derived.map((o) => [o.path, o]));
  return EXPECTED_MASTER_PATHS.map((path) => byPath.get(path));
}

async function assertBucketPrivate(client, label) {
  const { data, error } = await client.storage.getBucket(MASTER_BUCKET);
  if (error) {
    throw new Error(`${label}: cannot read bucket ${MASTER_BUCKET}: ${error.message}`);
  }
  if (!data) {
    throw new Error(`${label}: bucket ${MASTER_BUCKET} not found`);
  }
  if (data.public === true) {
    throw new Error(
      `${label}: refusing — ${MASTER_BUCKET} is public (must remain private)`,
    );
  }
  return data;
}

/** Metadata-only probe via list (no object download). */
async function listObjectMeta(client, path) {
  const normalized = path.replace(/^\/+/, "");
  const parts = normalized.split("/");
  const name = parts.pop();
  const dir = parts.join("/");
  const { data, error } = await client.storage.from(MASTER_BUCKET).list(dir, {
    search: name,
    limit: 100,
  });
  if (error) return { ok: false, error: error.message };
  const match = (data || []).find((f) => f.name === name);
  if (!match) return { ok: true, exists: false };
  const meta = match.metadata || {};
  const size =
    meta.size ?? meta.contentLength ?? match.metadata?.size ?? null;
  const contentType =
    meta.mimetype ?? meta.contentType ?? match.metadata?.mimetype ?? null;
  return {
    ok: true,
    exists: true,
    size: size != null ? Number(size) : null,
    contentType: contentType || null,
    updatedAt: match.updated_at || match.created_at || null,
  };
}

async function downloadMaster(client, path) {
  const { data, error } = await client.storage.from(MASTER_BUCKET).download(path);
  if (error) return { ok: false, error: error.message };
  const buf = Buffer.from(await data.arrayBuffer());
  return { ok: true, buf, contentType: data.type || undefined };
}

async function uploadMaster(client, path, buf, contentType) {
  const { error } = await client.storage.from(MASTER_BUCKET).upload(path, buf, {
    upsert: false,
    contentType: contentType || "video/mp4",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) {
    console.log(`Copy pinned media-masters objects to Staging (dry-run default).

  node scripts/catalog-copy-masters.mjs --in artifacts/catalog/prod-export.json \\
    --prod-env .env.local --staging-env .env.staging
  node scripts/catalog-copy-masters.mjs --in ... --execute

Dry-run uses list metadata only (no download/upload).
Never copies ${PREVIEW_BUCKET}. Never changes bucket policies.`);
    process.exit(0);
  }

  const execute = flags.has("execute");
  const skipMissing = flags.has("skip-missing");
  const inPath = opts.in;
  if (!inPath) throw new Error("Missing --in <export-manifest.json>");

  const prodEnvFile = opts["prod-env"] || ".env.local";
  const stagingEnvFile = opts["staging-env"] || ".env.staging";

  // Production client — read storage only
  loadEnvFile(prodEnvFile, { override: true });
  const production = createServiceClientFromEnv("production");

  // Staging client — write destination only (credentials isolated after reload)
  loadEnvFile(stagingEnvFile, { override: true });
  const staging = createServiceClientFromEnv("staging");

  assertStagingDestination(staging.ref, production.ref);

  const manifest = readJson(inPath);
  const derived = deriveMasterObjectsFromExport(manifest);
  const objects = assertExactAllowlist(derived);

  const prodBucket = await assertBucketPrivate(production.client, "production");
  const stgBucket = await assertBucketPrivate(staging.client, "staging");

  console.log("catalog-copy-masters:", execute ? "EXECUTE" : "DRY-RUN");
  console.log(`  productionRef=${production.ref}`);
  console.log(`  stagingRef=${staging.ref}`);
  console.log(
    `  bucket=${MASTER_BUCKET} prodPublic=${prodBucket.public} stagingPublic=${stgBucket.public}`,
  );
  console.log(`  masterObjects=${objects.length}`);
  console.log(`  mode=${execute ? "download+upload" : "metadata-list-only"}`);

  const plan = {
    wouldCopy: 0,
    alreadyOnStaging: 0,
    missingSource: [],
    errors: [],
    copied: 0,
  };

  for (const obj of objects) {
    const src = await listObjectMeta(production.client, obj.path);
    if (!src.ok) {
      plan.errors.push({ id: obj.id, path: obj.path, error: `source list: ${src.error}` });
      console.log(
        `ERROR\tid=${obj.id}\tstatus=${obj.processing_status}\tsrc=${MASTER_BUCKET}/${obj.path}\t${src.error}`,
      );
      continue;
    }
    if (!src.exists) {
      plan.missingSource.push({ id: obj.id, path: obj.path });
      console.log(
        `MISSING_SOURCE\tid=${obj.id}\tstatus=${obj.processing_status}\tsrc=${MASTER_BUCKET}/${obj.path}`,
      );
      continue;
    }

    const dst = await listObjectMeta(staging.client, obj.path);
    if (!dst.ok) {
      plan.errors.push({ id: obj.id, path: obj.path, error: `staging list: ${dst.error}` });
      console.log(
        `ERROR\tid=${obj.id}\tstatus=${obj.processing_status}\tdst=${MASTER_BUCKET}/${obj.path}\t${dst.error}`,
      );
      continue;
    }
    if (dst.exists) {
      plan.alreadyOnStaging += 1;
      console.log(
        `SKIP_EXISTS\tid=${obj.id}\tstatus=${obj.processing_status}\tsrc=${MASTER_BUCKET}/${obj.path}\tdst=${MASTER_BUCKET}/${obj.path}\tsize=${src.size}\tcontentType=${src.contentType}`,
      );
      continue;
    }

    plan.wouldCopy += 1;
    console.log(
      `COPY\tid=${obj.id}\tstatus=${obj.processing_status}\tsrc=${MASTER_BUCKET}/${obj.path}\tdst=${MASTER_BUCKET}/${obj.path}\tsize=${src.size}\tcontentType=${src.contentType}`,
    );

    if (!execute) continue;

    const dl = await downloadMaster(production.client, obj.path);
    if (!dl.ok) {
      plan.errors.push({ id: obj.id, path: obj.path, error: `download: ${dl.error}` });
      console.log(`EXECUTE_FAIL\tid=${obj.id}\tpath=${obj.path}\tdownload=${dl.error}`);
      continue;
    }
    if (src.size != null && dl.buf.length !== Number(src.size)) {
      plan.errors.push({
        id: obj.id,
        path: obj.path,
        error: `size mismatch downloaded=${dl.buf.length} listed=${src.size}`,
      });
      console.log(
        `EXECUTE_FAIL\tid=${obj.id}\tpath=${obj.path}\tsize mismatch downloaded=${dl.buf.length} listed=${src.size}`,
      );
      continue;
    }

    const up = await uploadMaster(
      staging.client,
      obj.path,
      dl.buf,
      src.contentType || dl.contentType || obj.mime_type || "video/mp4",
    );
    if (!up.ok) {
      plan.errors.push({ id: obj.id, path: obj.path, error: `upload: ${up.error}` });
      console.log(`EXECUTE_FAIL\tid=${obj.id}\tpath=${obj.path}\tupload=${up.error}`);
      continue;
    }
    plan.copied += 1;
    console.log(`EXECUTE_OK\tid=${obj.id}\tpath=${obj.path}\tbytes=${dl.buf.length}`);
  }

  console.log("---");
  console.log(`  wouldCopy=${plan.wouldCopy}`);
  console.log(`  alreadyOnStaging=${plan.alreadyOnStaging}`);
  console.log(`  missingSource=${plan.missingSource.length}`);
  console.log(`  errors=${plan.errors.length}`);
  if (execute) console.log(`  copied=${plan.copied}`);

  if (plan.missingSource.length) {
    console.warn("Missing source master objects:", plan.missingSource);
  }
  if (plan.errors.length) {
    console.error("Errors:", plan.errors);
  }

  if (plan.missingSource.length && !skipMissing && execute) {
    throw new Error(
      "Aborting execute: missing source objects (pass --skip-missing to allow partial copy)",
    );
  }

  if (!execute) {
    console.log("DRY-RUN complete — no storage objects downloaded, uploaded, or modified");
    console.log("Re-run with --execute after human approval");
    process.exit(plan.errors.length || plan.missingSource.length ? 1 : 0);
  }

  if (plan.errors.length) {
    throw new Error(`EXECUTE finished with ${plan.errors.length} error(s)`);
  }
  console.log("EXECUTE complete (media-masters only; bucket policies unchanged)");
}

main().catch((err) => {
  console.error("catalog-copy-masters FAILED:", err.message || err);
  process.exit(1);
});
