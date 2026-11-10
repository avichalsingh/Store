/**
 * Safety gate for Homepage CMS → Supabase publish.
 * Default OFF: dry-run validation only, no remote DB connection/writes.
 * Independent of CATALOG_REMOTE_PUBLISH — do not couple the two gates.
 *
 * Enable only with explicit approval via HOMEPAGE_REMOTE_PUBLISH=true.
 */

export const HOMEPAGE_REMOTE_PUBLISH_ENV = "HOMEPAGE_REMOTE_PUBLISH";

export function isHomepageRemotePublishEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env[HOMEPAGE_REMOTE_PUBLISH_ENV]?.trim() === "true";
}

export function homepageRemotePublishGatedMessage(): string {
  return `Homepage publish validated. Remote upsert skipped (${HOMEPAGE_REMOTE_PUBLISH_ENV} is not true).`;
}

/** Admin-facing toast copy: dry-run vs real Supabase write. */
export function homepagePublishUserMessage(dryRun: boolean): string {
  if (dryRun) {
    return `Homepage saved locally. Publish dry-run (${HOMEPAGE_REMOTE_PUBLISH_ENV} is not enabled — no Supabase write).`;
  }
  return "Homepage published to Supabase";
}
