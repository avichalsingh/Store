/**
 * Explicit legacy product id mappings for purchase/library ownership.
 * Maps old caption/hashtag pack ids to canonical CAPTION_PACK product ids.
 * These maps affect ownership checks only — they do not merge CMS records.
 */

/** Legacy caption product id → canonical CAPTION_PACK product id */
export const LEGACY_CAPTION_TO_CAPTION_PACK: Readonly<Record<string, string>> = {
  "prod-caption-001": "prod-content-001",
  "prod-caption-006": "prod-content-002",
  "prod-caption-004": "prod-content-003",
};

/** Legacy hashtag product id → canonical CAPTION_PACK product id */
export const LEGACY_HASHTAG_TO_CAPTION_PACK: Readonly<Record<string, string>> = {
  "prod-hashtag-001": "prod-content-001",
  "prod-hashtag-004": "prod-content-002",
  "prod-hashtag-005": "prod-content-003",
};

/** Legacy hashtag slug → CAPTION_PACK slug (for /hashtags/[slug] redirects only) */
export const LEGACY_HASHTAG_SLUG_TO_CAPTION_SLUG: Readonly<
  Record<string, string>
> = {
  "viral-reels-hashtag-pack": "viral-reels-content-pack",
  "funny-content-hashtag-pack": "funny-character-content-pack",
  "relationship-reel-hashtag-pack": "pov-relationship-content-pack",
};

/** @deprecated Use LEGACY_HASHTAG_SLUG_TO_CAPTION_SLUG */
export const LEGACY_HASHTAG_SLUG_TO_CONTENT_SLUG = LEGACY_HASHTAG_SLUG_TO_CAPTION_SLUG;

/** Bundle / add-on replacements: old product id → CAPTION_PACK id */
export const LEGACY_PRODUCT_REPLACEMENT: Readonly<Record<string, string>> = {
  ...LEGACY_CAPTION_TO_CAPTION_PACK,
  ...LEGACY_HASHTAG_TO_CAPTION_PACK,
};

const captionPackToLegacyIds = new Map<string, Set<string>>();

function registerReverse(map: Readonly<Record<string, string>>) {
  for (const [legacyId, captionPackId] of Object.entries(map)) {
    const set = captionPackToLegacyIds.get(captionPackId) ?? new Set<string>();
    set.add(legacyId);
    captionPackToLegacyIds.set(captionPackId, set);
  }
}

registerReverse(LEGACY_CAPTION_TO_CAPTION_PACK);
registerReverse(LEGACY_HASHTAG_TO_CAPTION_PACK);

/** Resolve a legacy id to its CAPTION_PACK successor when explicitly mapped. */
export function resolveCaptionPackSuccessor(productId: string): string | undefined {
  return (
    LEGACY_CAPTION_TO_CAPTION_PACK[productId] ??
    LEGACY_HASHTAG_TO_CAPTION_PACK[productId] ??
    LEGACY_PRODUCT_REPLACEMENT[productId]
  );
}

/** @deprecated Use resolveCaptionPackSuccessor */
export const resolveContentPackSuccessor = resolveCaptionPackSuccessor;

/** All legacy product ids that explicitly map to a CAPTION_PACK. */
export function legacyIdsForCaptionPack(captionPackId: string): string[] {
  return [...(captionPackToLegacyIds.get(captionPackId) ?? [])];
}

/** @deprecated Use legacyIdsForCaptionPack */
export const legacyIdsForContentPack = legacyIdsForCaptionPack;

/** Whether this product id is a known legacy caption/hashtag pack. */
export function isLegacyCaptionOrHashtagId(productId: string): boolean {
  return (
    productId in LEGACY_CAPTION_TO_CAPTION_PACK ||
    productId in LEGACY_HASHTAG_TO_CAPTION_PACK
  );
}

/** Expand owned ids with explicit CAPTION_PACK ↔ legacy mappings. */
export function expandOwnedProductIds(ownedIds: Iterable<string>): Set<string> {
  const expanded = new Set(ownedIds);
  for (const id of ownedIds) {
    const successor = resolveCaptionPackSuccessor(id);
    if (successor) expanded.add(successor);
    for (const legacyId of legacyIdsForCaptionPack(id)) {
      expanded.add(legacyId);
    }
  }
  return expanded;
}

export function userOwnsProductId(
  productId: string,
  ownedIds: Iterable<string>,
): boolean {
  const expanded = expandOwnedProductIds(ownedIds);
  return expanded.has(productId);
}
