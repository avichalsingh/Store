/**
 * Shared safety gate for CMS → Supabase catalog upserts.
 * Default OFF: dry-run validation only, no remote DB connection/writes.
 * Enable only with explicit approval via CATALOG_REMOTE_PUBLISH=true.
 *
 * Applies to products, characters, and collections (same behaviour).
 */

export const CATALOG_REMOTE_PUBLISH_ENV = "CATALOG_REMOTE_PUBLISH";

export function isCatalogRemotePublishEnabled(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): boolean {
  return env[CATALOG_REMOTE_PUBLISH_ENV]?.trim() === "true";
}

export function catalogRemotePublishGatedMessage(entity: string): string {
  return `${entity} publish validated. Remote upsert skipped (${CATALOG_REMOTE_PUBLISH_ENV} is not true).`;
}

/** Admin-facing toast copy: dry-run vs real Supabase write. */
export function catalogPublishUserMessage(
  entityLabel: string,
  status: string,
  dryRun: boolean,
): string {
  if (dryRun) {
    return status === "active"
      ? `${entityLabel} saved locally. Catalog sync dry-run (${CATALOG_REMOTE_PUBLISH_ENV} is not enabled — no Supabase write).`
      : `${entityLabel} saved locally. Catalog unpublish dry-run (${CATALOG_REMOTE_PUBLISH_ENV} is not enabled — no Supabase write).`;
  }
  return status === "active"
    ? `${entityLabel} published to Supabase catalog`
    : `${entityLabel} unpublished from Supabase catalog (status: ${status})`;
}
