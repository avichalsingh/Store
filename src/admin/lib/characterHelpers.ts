import type {
  AdminCharacter,
  AdminCharacterStatus,
  AdminCollection,
  AdminProduct,
} from "@/admin/types";

const VALID_STATUSES: AdminCharacterStatus[] = [
  "draft",
  "active",
  "hidden",
  "archived",
];

export function getCharacterProducts(
  characterId: string,
  products: AdminProduct[],
): AdminProduct[] {
  return products.filter((p) => p.characterId === characterId);
}

export function getCharacterCollections(
  characterId: string,
  products: AdminProduct[],
  collections: AdminCollection[],
): AdminCollection[] {
  const productIds = new Set(
    getCharacterProducts(characterId, products).map((p) => p.id),
  );
  return collections.filter((c) =>
    c.productIds.some((id) => productIds.has(id)),
  );
}

export function deriveCharacterMetrics(
  characterId: string,
  products: AdminProduct[],
): {
  plays: number;
  saves: number;
  revenueInr: number;
} {
  const owned = getCharacterProducts(characterId, products);
  return {
    plays: owned.reduce((sum, p) => sum + (p.performance?.playsNumeric ?? 0), 0),
    saves: owned.reduce((sum, p) => sum + (p.creatorActivity?.saved ?? 0), 0),
    revenueInr: owned.reduce((sum, p) => sum + (p.revenueInr ?? 0), 0),
  };
}

export function recomputeCharacterCounts(
  character: AdminCharacter,
  products: AdminProduct[],
  collections: AdminCollection[],
): AdminCharacter {
  const owned = getCharacterProducts(character.id, products);
  const cols = getCharacterCollections(character.id, products, collections);
  return {
    ...character,
    productCount: owned.length,
    collectionCount: cols.length,
  };
}

export function normalizeCharacter(
  input: Partial<AdminCharacter> &
    Pick<AdminCharacter, "id" | "name" | "slug">,
): AdminCharacter {
  const name = input.name ?? "";
  const legacyStatus = input.status;
  const status: AdminCharacterStatus =
    legacyStatus && VALID_STATUSES.includes(legacyStatus as AdminCharacterStatus)
      ? (legacyStatus as AdminCharacterStatus)
      : legacyStatus === "active"
        ? "active"
        : "draft";

  const stamp = new Date().toISOString();

  return {
    id: input.id,
    name,
    slug: input.slug ?? "",
    image: input.image ?? "/media/characters/milo.jpg",
    shortBio: input.shortBio ?? "",
    description: input.description ?? "",
    accentColor: input.accentColor || "#e23d73",
    status,
    featured: input.featured ?? false,
    showOnCharactersPage: input.showOnCharactersPage ?? true,
    pageHeadline: input.pageHeadline ?? (name ? `Meet ${name}` : ""),
    pageIntro: input.pageIntro ?? input.shortBio ?? "",
    featuredProductId: input.featuredProductId,
    featuredCollectionId: input.featuredCollectionId,
    showProductsOnPage: input.showProductsOnPage ?? true,
    showCollectionsOnPage: input.showCollectionsOnPage ?? true,
    productCount: input.productCount ?? 0,
    collectionCount: input.collectionCount ?? 0,
    createdAt: input.createdAt ?? stamp,
    updatedAt: input.updatedAt ?? stamp,
  };
}

export function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}
