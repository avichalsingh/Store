/**
 * Public catalogue publication gate.
 *
 * Defence-in-depth on top of the `catalog_products` view (`status = 'active'`).
 * Excludes rows that are not customer-ready using explicit status, tags, and
 * documented seed fixture id prefixes — never title heuristics alone.
 */

/** Tags that mark a product as internal / test / non-customer. */
export const PUBLIC_CATALOG_EXCLUSION_TAGS = [
  "integration-test",
  "internal",
  "qa-only",
  "test-fixture",
  "dummy",
] as const;

/**
 * Id / slug prefixes reserved by repo seed fixtures
 * (`supabase/seeds/dummy_products_phase_a.sql`).
 */
export const PUBLIC_CATALOG_SEED_FIXTURE_PREFIXES = ["dummy-"] as const;

export type PublicCatalogPublicationInput = {
  id?: string | null;
  slug?: string | null;
  status?: string | null;
  tags?: readonly string[] | null;
};

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase();
}

function hasExclusionTag(tags: readonly string[] | null | undefined): boolean {
  if (!tags?.length) return false;
  const excluded = new Set(
    PUBLIC_CATALOG_EXCLUSION_TAGS.map((t) => normalizeTag(t)),
  );
  return tags.some((t) => typeof t === "string" && excluded.has(normalizeTag(t)));
}

function hasSeedFixtureId(idOrSlug: string | null | undefined): boolean {
  const value = (idOrSlug ?? "").trim().toLowerCase();
  if (!value) return false;
  return PUBLIC_CATALOG_SEED_FIXTURE_PREFIXES.some((prefix) =>
    value.startsWith(prefix),
  );
}

/**
 * True when a product may appear on the public storefront / be sold.
 * Missing status is treated as publishable only after the catalog view
 * already filtered (mapped CatalogProduct rows omit status).
 */
export function isPublicCatalogPublishable(
  product: PublicCatalogPublicationInput,
): boolean {
  const status = product.status?.trim().toLowerCase();
  if (status && status !== "active") return false;
  if (hasExclusionTag(product.tags)) return false;
  if (hasSeedFixtureId(product.id) || hasSeedFixtureId(product.slug)) {
    return false;
  }
  return Boolean(product.id?.trim());
}

export function filterPublicCatalogProducts<T extends PublicCatalogPublicationInput>(
  products: readonly T[],
): T[] {
  return products.filter((p) => isPublicCatalogPublishable(p));
}

/** Why a product was rejected — for audits / tests. */
export function publicCatalogExclusionReason(
  product: PublicCatalogPublicationInput,
): string | null {
  const status = product.status?.trim().toLowerCase();
  if (status && status !== "active") {
    return `status:${status || "empty"}`;
  }
  if (hasExclusionTag(product.tags)) {
    const hit = (product.tags ?? [])
      .map(normalizeTag)
      .find((t) =>
        (PUBLIC_CATALOG_EXCLUSION_TAGS as readonly string[]).includes(t),
      );
    return `tag:${hit ?? "excluded"}`;
  }
  if (hasSeedFixtureId(product.id)) return "seed-id-prefix:dummy-";
  if (hasSeedFixtureId(product.slug)) return "seed-slug-prefix:dummy-";
  if (!product.id?.trim()) return "missing-id";
  return null;
}
