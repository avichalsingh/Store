/**
 * Non-production smoke checks for worker runtime compatibility.
 * Does not call production Supabase APIs or require real secrets.
 *
 * Usage (from worker/): node scripts/smoke-runtime.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

if (typeof WebSocket === "undefined") {
  fail(
    "Native WebSocket missing — use Node.js 22+ (required by @supabase/realtime-js)",
  );
}
console.log(`OK WebSocket (node ${process.versions.node})`);

try {
  createClient("https://example.supabase.co", "sb_smoke_test_anon_key", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  console.log("OK createClient (no network)");
} catch (err) {
  fail(`createClient threw: ${err instanceof Error ? err.message : err}`);
}

const ff = spawnSync("ffmpeg", ["-hide_banner", "-version"], {
  encoding: "utf8",
});
if (ff.error || ff.status !== 0) {
  fail(`ffmpeg not available: ${ff.error?.message || ff.stderr || "exit"}`);
}
console.log(`OK ffmpeg: ${ff.stdout.split("\n")[0]}`);

console.log("SMOKE_RUNTIME_OK");
