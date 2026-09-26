import type { AdminCharacter, AdminProduct, MediaAsset } from "@/admin/types";

export type PublishCatalogResult =
  | { ok: true; id: string; status: string }
  | { ok: false; error: string; status: number };

export type PublishProductContext = {
  /** Full CMS character list (or a subset containing required IDs). */
  characters: AdminCharacter[];
  /** Full CMS product list (used to resolve related product IDs). */
  products: AdminProduct[];
  /** Full CMS media library (used to resolve mediaAssetId). */
  mediaAssets: MediaAsset[];
};

/** Collect real CMS dependency records needed to publish `product`. */
export function collectProductPublishDependencies(
  product: AdminProduct,
  characters: AdminCharacter[],
  products: AdminProduct[],
  mediaAssets: MediaAsset[],
): {
  characters: AdminCharacter[];
  dependencyProducts: AdminProduct[];
  mediaAssets: MediaAsset[];
} {
  const characterIds = new Set<string>();
  const relatedIds = new Set<string>();
  const mediaIds = new Set<string>();

  const mainCharacterId = product.characterId?.trim();
  if (mainCharacterId) characterIds.add(mainCharacterId);

  const mainMediaId = product.mediaAssetId?.trim();
  if (mainMediaId) mediaIds.add(mainMediaId);

  for (const rel of product.relationships ?? []) {
    const relatedId = rel.relatedProductId?.trim();
    if (relatedId && relatedId !== product.id) {
      relatedIds.add(relatedId);
    }
  }

  const dependencyProducts = products.filter((p) => relatedIds.has(p.id));

  for (const related of dependencyProducts) {
    const relatedCharacterId = related.characterId?.trim();
    if (relatedCharacterId) characterIds.add(relatedCharacterId);
    const relatedMediaId = related.mediaAssetId?.trim();
    if (relatedMediaId) mediaIds.add(relatedMediaId);
  }

  return {
    characters: characters.filter((c) => characterIds.has(c.id)),
    dependencyProducts,
    mediaAssets: mediaAssets.filter((a) => mediaIds.has(a.id)),
  };
}

/**
 * Client helper: publish/republish an active product to Supabase via the
 * server-only admin catalog route (uses httpOnly session cookie).
 * Sends real CMS media + character + related-product dependencies for auto-sync.
 */
export async function publishProductToCatalog(
  product: AdminProduct,
  context: PublishProductContext,
): Promise<PublishCatalogResult> {
  const deps = collectProductPublishDependencies(
    product,
    context.characters,
    context.products,
    context.mediaAssets,
  );

  let response: Response;
  try {
    response = await fetch("/api/admin/catalog/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        product,
        characters: deps.characters,
        dependencyProducts: deps.dependencyProducts,
        mediaAssets: deps.mediaAssets,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the catalog publish API",
      status: 0,
    };
  }

  let body: { error?: string; id?: string; status?: string; ok?: boolean } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : "Failed to publish product to the storefront catalog";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  return {
    ok: true,
    id: body.id ?? product.id,
    status: body.status ?? product.status,
  };
}

/**
 * Client helper: publish a CMS character to public.characters
 * (preserves exact character id; uses httpOnly session cookie).
 */
export async function publishCharacterToCatalog(
  character: AdminCharacter,
): Promise<PublishCatalogResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/catalog/characters/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ character }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the character publish API",
      status: 0,
    };
  }

  let body: { error?: string; id?: string; status?: string; ok?: boolean } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : "Failed to publish character to the storefront catalog";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  return {
    ok: true,
    id: body.id ?? character.id,
    status: body.status ?? character.status,
  };
}
