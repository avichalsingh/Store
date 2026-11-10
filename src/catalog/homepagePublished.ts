import type { HomepageConfigDocument } from "@/admin/types";
import {
  fromHomepageConfigDocument,
  toHomepageConfigDocument,
} from "@/catalog/homepageConfig";

/**
 * True when the stored `published` jsonb is absent or empty — storefront must
 * keep seed / local fallback behavior (no curated IDs invented from defaults).
 */
export function isRawPublishedHomepageEmpty(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw !== "object" || Array.isArray(raw)) return true;
  const record = raw as Record<string, unknown>;
  if (Object.keys(record).length === 0) return true;

  const hasSections =
    Array.isArray(record.sections) && record.sections.length > 0;
  const hasHero =
    record.hero != null &&
    typeof record.hero === "object" &&
    !Array.isArray(record.hero);

  return !hasSections && !hasHero;
}

/**
 * Normalize a candidate HomepageConfigDocument for publish / public read.
 * Always returns a fully normalized document (sections + hero).
 */
export function normalizeHomepageConfigDocument(
  raw: unknown,
): HomepageConfigDocument {
  const { sections, hero } = fromHomepageConfigDocument(raw);
  return toHomepageConfigDocument(sections, hero);
}

/**
 * Parse a DB `published` jsonb value into a public document, or null when
 * unpublished / empty. Never invents a "published" document from `{}`.
 */
export function parsePublishedHomepageDocument(
  raw: unknown,
): HomepageConfigDocument | null {
  if (isRawPublishedHomepageEmpty(raw)) return null;
  return normalizeHomepageConfigDocument(raw);
}

export type HomepagePublicApiResponse = {
  status: "published" | "unpublished";
  document: HomepageConfigDocument | null;
  publishedAt: string | null;
  publishedRevision: number;
  /** Present when the catalog view/table is unavailable (migration not applied). */
  error?: string;
};
