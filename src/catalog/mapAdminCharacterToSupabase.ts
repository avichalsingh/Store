/**
 * Map CMS AdminCharacter → public.characters row shape.
 */

import type { AdminCharacter, AdminCharacterStatus } from "@/admin/types";

export type CharactersTableRow = {
  id: string;
  name: string;
  slug: string;
  image: string;
  short_bio: string;
  description: string;
  accent_color: string;
  status: AdminCharacterStatus;
  featured: boolean;
  show_on_characters_page: boolean;
  page_headline: string | null;
  page_intro: string | null;
  featured_product_id: string | null;
  featured_collection_id: string | null;
  show_products_on_page: boolean | null;
  show_collections_on_page: boolean | null;
  product_count: number;
  collection_count: number;
  created_at: string;
  updated_at: string;
};

const STATUSES = new Set<AdminCharacterStatus>([
  "draft",
  "active",
  "hidden",
  "archived",
]);

export function validateAdminCharacterForPublish(
  character: unknown,
): { ok: true; character: AdminCharacter } | { ok: false; error: string } {
  if (!character || typeof character !== "object") {
    return { ok: false, error: "Invalid character payload" };
  }
  const c = character as Partial<AdminCharacter>;
  if (!c.id || typeof c.id !== "string" || !c.id.trim()) {
    return { ok: false, error: "Character id is required" };
  }
  if (!c.name || typeof c.name !== "string" || !c.name.trim()) {
    return { ok: false, error: "Character name is required" };
  }
  if (!c.slug || typeof c.slug !== "string" || !c.slug.trim()) {
    return { ok: false, error: "Character slug is required" };
  }
  if (!c.status || !STATUSES.has(c.status)) {
    return { ok: false, error: "Invalid or missing character status" };
  }
  return { ok: true, character: c as AdminCharacter };
}

/** Map the full CMS character record — preserve exact id (e.g. char-milo). */
export function adminCharacterToCharactersRow(
  character: AdminCharacter,
): CharactersTableRow {
  return {
    id: character.id.trim(),
    name: character.name.trim(),
    slug: character.slug.trim(),
    image: character.image ?? "",
    short_bio: character.shortBio ?? "",
    description: character.description ?? "",
    accent_color: character.accentColor ?? "",
    status: character.status,
    featured: Boolean(character.featured),
    show_on_characters_page: Boolean(character.showOnCharactersPage),
    page_headline: character.pageHeadline?.trim() || null,
    page_intro: character.pageIntro?.trim() || null,
    featured_product_id: character.featuredProductId?.trim() || null,
    featured_collection_id: character.featuredCollectionId?.trim() || null,
    show_products_on_page:
      character.showProductsOnPage === undefined
        ? null
        : Boolean(character.showProductsOnPage),
    show_collections_on_page:
      character.showCollectionsOnPage === undefined
        ? null
        : Boolean(character.showCollectionsOnPage),
    product_count: Number(character.productCount) || 0,
    collection_count: Number(character.collectionCount) || 0,
    created_at: character.createdAt,
    updated_at: character.updatedAt,
  };
}
