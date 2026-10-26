/**
 * Regression check: master download + preview upload must stream via disk I/O,
 * not Buffer the whole video in Node memory (Render 512MB OOM class).
 *
 * Usage (from worker/ after build): node scripts/smoke-no-buffer-io.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const supabaseJs = readFileSync(join(root, "dist/supabase.js"), "utf8");
const ffmpegJs = readFileSync(join(root, "dist/ffmpeg.js"), "utf8");
const processJobJs = readFileSync(join(root, "dist/processJob.js"), "utf8");
const dockerfile = readFileSync(join(root, "Dockerfile"), "utf8");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function extractFn(source, name) {
  const re = new RegExp(
    `async function ${name}\\([\\s\\S]*?\\n(?=async function |export |function |$)`,
  );
  const m = source.match(re);
  if (!m) {
    // tsc may emit `function name(` without async, or export wrapper.
    const re2 = new RegExp(
      `function ${name}\\([\\s\\S]*?\\n(?=async function |export |function |$)`,
    );
    const m2 = source.match(re2);
    if (!m2) fail(`could not locate function ${name} in dist`);
    return m2[0];
  }
  return m[0];
}

const downloadFn = extractFn(supabaseJs, "downloadMasterToFile");
if (!downloadFn.includes("createWriteStream")) {
  fail("downloadMasterToFile must write via createWriteStream");
}
if (!downloadFn.includes("pipeline")) {
  fail("downloadMasterToFile must pipeline the response body to disk");
}
if (/arrayBuffer\s*\(/.test(downloadFn) || /\.readFile\s*\(/.test(downloadFn)) {
  fail("downloadMasterToFile must not buffer the master via arrayBuffer/readFile");
}

const uploadFn = extractFn(supabaseJs, "uploadPublicObject");
if (!uploadFn.includes("createReadStream")) {
  fail("uploadPublicObject must stream from disk via createReadStream");
}
if (/\.readFile\s*\(/.test(uploadFn) || /readFileSync\s*\(/.test(uploadFn)) {
  fail("uploadPublicObject must not readFile() the whole preview into memory");
}
if (!uploadFn.includes("duplex")) {
  fail("uploadPublicObject must pass duplex for Node stream uploads");
}

if (!ffmpegJs.includes("MEMORY_SAFE_GLOBAL_ARGS") && !ffmpegJs.includes('"-threads"')) {
  fail("ffmpeg spawn must pass memory-safe -threads limits");
}
if (!ffmpegJs.includes("activeChildren") && !ffmpegJs.includes("terminateAllFfmpeg")) {
  fail("ffmpeg module must track children for shutdown termination");
}

if (!/unlink\(\s*masterFile\s*\)/.test(processJobJs)) {
  fail("processMediaJob should unlink the master before uploads");
}

// Runtime image config for 512MB Render instances (heap ceiling ≠ total RSS).
if (!/WORKER_MAX_CONCURRENT_JOBS=1/.test(dockerfile)) {
  fail("Dockerfile must keep WORKER_MAX_CONCURRENT_JOBS=1");
}
if (!/NODE_OPTIONS=--max-old-space-size=192/.test(dockerfile)) {
  fail("Dockerfile must set NODE_OPTIONS=--max-old-space-size=192");
}
if (!/node:22-bookworm-slim/.test(dockerfile)) {
  fail("Dockerfile must use node:22-bookworm-slim");
}

// Confirm installed storage-js accepts Node streams (not Buffer-only).
const storageApi = readFileSync(
  join(
    root,
    "node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts",
  ),
  "utf8",
);
if (!storageApi.includes("NodeJS.ReadableStream")) {
  fail(
    "Installed @supabase/storage-js FileBody must include NodeJS.ReadableStream",
  );
}

console.log("OK downloadMasterToFile streams to disk");
console.log("OK uploadPublicObject streams from disk");
console.log("OK ffmpeg memory-safe args + child tracking present");
console.log("OK processJob unlinks master before upload");
console.log("OK Dockerfile concurrency/heap/Node 22 runtime config");
console.log("OK storage-js FileBody includes NodeJS.ReadableStream");
console.log("SMOKE_NO_BUFFER_IO_OK");