/**
 * Safe connection check for Supabase (no schema required).
 * Run: npx tsx scripts/verify-supabase.ts
 * Or: node --import tsx scripts/verify-supabase.ts
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
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
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!url || !anonKey) {
    console.error(
      "FAIL: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
    process.exit(1);
  }

  // Do not print secrets — only confirm presence / host.
  let host = "(invalid url)";
  try {
    host = new URL(url).host;
  } catch {
    console.error("FAIL: NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
    process.exit(1);
  }

  console.log(`Connecting to Supabase host: ${host}`);

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Safe read: Auth session check does not require application tables.
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error("FAIL: Supabase auth.getSession error:", error.message);
    process.exit(1);
  }

  // Publishable-key-safe probe: Auth settings accepts sb_publishable_... / anon keys
  // via `apikey`. Do NOT use GET /rest/v1/ — that OpenAPI root requires a secret key.
  const authSettings = await fetch(
    `${url.replace(/\/$/, "")}/auth/v1/settings`,
    {
      headers: {
        apikey: anonKey,
      },
    },
  );

  if (!authSettings.ok) {
    console.error(
      `FAIL: Auth settings probe returned HTTP ${authSettings.status} ${authSettings.statusText}`,
    );
    process.exit(1);
  }

  console.log("OK: Supabase connection verified");
  console.log(
    `- auth.getSession(): ${data.session ? "session present" : "no session (expected)"}`,
  );
  console.log(`- auth/v1/settings: HTTP ${authSettings.status}`);
}

main().catch((err) => {
  console.error("FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
