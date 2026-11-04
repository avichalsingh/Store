#!/usr/bin/env node
/**
 * Create a confirmed customer on Staging Auth for local sign-in testing.
 *
 * Default: DRY-RUN (validates env + prints plan; no user created).
 *
 * Usage:
 *   node scripts/staging-create-test-customer.mjs --env-file .env.staging
 *   node scripts/staging-create-test-customer.mjs --env-file .env.staging \
 *     --email you@example.com --password '...' --execute
 *
 * Safety:
 * - Refuses Production project refs.
 * - Never prints the password.
 * - Does not change Auth settings / SMTP / redirect allowlists.
 */

import { createClient } from "@supabase/supabase-js";
import {
  assertStagingDestination,
  loadEnvFile,
  parseArgs,
  projectRefFromUrl,
  requireEnv,
} from "./lib/catalog-transfer.mjs";

/** Known Production ref from this repo's catalogue transfer — never write here. */
const KNOWN_PRODUCTION_REF = "cswtkfeskfdvtkokjcvn";

async function main() {
  const { flags, opts } = parseArgs(process.argv.slice(2));
  if (flags.has("help") || flags.has("h")) {
    console.log(`Create a confirmed Staging Auth customer (dry-run default).

  node scripts/staging-create-test-customer.mjs --env-file .env.staging
  node scripts/staging-create-test-customer.mjs --env-file .env.staging --email a@b.com --password '...' --execute`);
    process.exit(0);
  }

  const execute = flags.has("execute");
  const envFile = opts["env-file"] || ".env.staging";
  loadEnvFile(envFile, { override: true });

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const ref = projectRefFromUrl(url);
  if (!ref) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not a supabase.co URL");

  assertStagingDestination(ref, KNOWN_PRODUCTION_REF);
  if (ref === KNOWN_PRODUCTION_REF) {
    throw new Error("Refusing: destination is Production");
  }

  const email =
    opts.email?.trim() ||
    `pragvi.local.${Date.now().toString(36)}@gmail.com`;
  const password = opts.password || `PragviLocal-${Date.now().toString(36)}!aA1`;

  if (!email.includes("@")) throw new Error("Invalid --email");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  console.log("staging-create-test-customer:", execute ? "EXECUTE" : "DRY-RUN");
  console.log(`  envFile=${envFile}`);
  console.log(`  stagingRef=${ref}`);
  console.log(`  email=${email}`);
  console.log(`  passwordLength=${password.length} (value not printed)`);
  console.log(`  email_confirm=true`);

  if (!execute) {
    console.log("DRY-RUN complete — no Auth user created");
    console.log("Re-run with --execute after approval");
    process.exit(0);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    throw new Error(`createUser failed: ${error.message}`);
  }

  const userId = data.user?.id;
  console.log(`EXECUTE complete — userId=${userId || "(missing)"}`);
  console.log("Sign in locally at /signin with the email above and the password you passed.");
}

main().catch((err) => {
  console.error("staging-create-test-customer FAILED:", err.message || err);
  process.exit(1);
});
