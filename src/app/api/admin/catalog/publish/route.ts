import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  adminCharacterToCharactersRow,
  validateAdminCharacterForPublish,
} from "@/catalog/mapAdminCharacterToSupabase";
import {
  adminMediaAssetToMediaAssetsRow,
  validateAdminMediaAssetForPublish,
} from "@/catalog/mapAdminMediaAssetToSupabase";
import {
  adminProductToProductsRow,
  adminRelationshipsToRows,
  validateAdminProductForPublish,
} from "@/catalog/mapAdminProductToSupabase";
import type { AdminCharacter, AdminProduct, MediaAsset } from "@/admin/types";
import { createServiceClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function safeServerError(fallback: string) {
  return NextResponse.json({ error: fallback }, { status: 500 });
}

function conflict(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}

function asCharacterArray(value: unknown): AdminCharacter[] {
  if (!Array.isArray(value)) return [];
  const out: AdminCharacter[] = [];
  for (const item of value) {
    const validated = validateAdminCharacterForPublish(item);
    if (validated.ok) out.push(validated.character);
  }
  return out;
}

function asProductArray(value: unknown): AdminProduct[] {
  if (!Array.isArray(value)) return [];
  const out: AdminProduct[] = [];
  for (const item of value) {
    const validated = validateAdminProductForPublish(item);
    if (validated.ok) out.push(validated.product);
  }
  return out;
}

function asMediaAssetArray(value: unknown): MediaAsset[] {
  if (!Array.isArray(value)) return [];
  const out: MediaAsset[] = [];
  for (const item of value) {
    const validated = validateAdminMediaAssetForPublish(item);
    if (validated.ok) out.push(validated.asset);
  }
  return out;
}

/**
 * Upsert a real CMS media asset. Never invents rows or nulls a real ref.
 */
async function syncMediaAssetDependency(
  supabase: SupabaseClient,
  mediaAssetId: string,
  byId: Map<string, MediaAsset>,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const asset = byId.get(mediaAssetId);
  if (!asset) {
    return {
      ok: false,
      response: conflict(
        `Referenced media asset "${mediaAssetId}" does not exist in CMS.`,
      ),
    };
  }

  const row = adminMediaAssetToMediaAssetsRow(asset);
  const { error } = await supabase
    .from("media_assets")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[catalog/publish] media_assets upsert", error.message);
    return {
      ok: false,
      response: safeServerError("Failed to sync media asset dependency"),
    };
  }
  return { ok: true };
}

/**
 * Upsert a real CMS character. Never invents rows.
 * Draft characters are rejected (do not silently activate).
 */
async function syncCharacterDependency(
  supabase: SupabaseClient,
  characterId: string,
  byId: Map<string, AdminCharacter>,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const character = byId.get(characterId);
  if (!character) {
    return {
      ok: false,
      response: conflict(
        `Referenced character "${characterId}" does not exist in CMS. Add or restore that character first.`,
      ),
    };
  }
  if (character.status === "draft") {
    return {
      ok: false,
      response: conflict(
        `Referenced character "${characterId}" ("${character.name}") is a draft in CMS and cannot be auto-published. Publish or activate that character first.`,
      ),
    };
  }

  const row = adminCharacterToCharactersRow(character);
  const { error } = await supabase
    .from("characters")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[catalog/publish] character upsert", error.message);
    return {
      ok: false,
      response: safeServerError("Failed to sync character dependency"),
    };
  }
  return { ok: true };
}

/**
 * Upsert a real CMS related product (row only — not its relationships).
 * Draft products are rejected (do not silently activate).
 */
async function syncRelatedProductDependency(
  supabase: SupabaseClient,
  relatedId: string,
  productsById: Map<string, AdminProduct>,
  charactersById: Map<string, AdminCharacter>,
  mediaAssetsById: Map<string, MediaAsset>,
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const related = productsById.get(relatedId);
  if (!related) {
    return {
      ok: false,
      response: conflict(
        `Related product "${relatedId}" does not exist in CMS. Add or restore that product first.`,
      ),
    };
  }
  if (related.status === "draft") {
    return {
      ok: false,
      response: conflict(
        `Related product "${relatedId}" ("${related.name}") is a draft in CMS and cannot be auto-published. Publish or activate that product first.`,
      ),
    };
  }

  const mediaAssetId = related.mediaAssetId?.trim();
  if (mediaAssetId) {
    const syncedMedia = await syncMediaAssetDependency(
      supabase,
      mediaAssetId,
      mediaAssetsById,
    );
    if (!syncedMedia.ok) return syncedMedia;
  }

  const characterId = related.characterId?.trim();
  if (characterId) {
    const synced = await syncCharacterDependency(
      supabase,
      characterId,
      charactersById,
    );
    if (!synced.ok) return synced;
  }

  const row = adminProductToProductsRow(related);
  const { error } = await supabase
    .from("products")
    .upsert(row, { onConflict: "id" });

  if (error) {
    console.error("[catalog/publish] related product upsert", error.message);
    if (error.code === "23505") {
      return {
        ok: false,
        response: conflict(
          `Related product "${relatedId}" conflicts with an existing catalog slug`,
        ),
      };
    }
    return {
      ok: false,
      response: safeServerError("Failed to sync related product dependency"),
    };
  }
  return { ok: true };
}

/**
 * Upsert a CMS product into public.products (+ replace its relationships).
 * Auto-syncs real CMS media, character, and related-product dependencies.
 * Auth: httpOnly cookie. DB: service-role (server-only).
 */
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return unauthorized();
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    return safeServerError("Server catalog publish is not configured");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  const rawProduct =
    payload && payload.product !== undefined ? payload.product : body;

  const validated = validateAdminProductForPublish(rawProduct);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const product = validated.product;
  const charactersById = new Map(
    asCharacterArray(payload?.characters).map((c) => [c.id, c]),
  );
  const dependencyProductsById = new Map(
    asProductArray(payload?.dependencyProducts).map((p) => [p.id, p]),
  );
  const mediaAssetsById = new Map(
    asMediaAssetArray(payload?.mediaAssets).map((a) => [a.id, a]),
  );

  const row = adminProductToProductsRow(product);
  const relationshipRows = adminRelationshipsToRows(
    product.id,
    product.relationships,
  );

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return safeServerError("Server catalog publish is not configured");
  }

  // 1) Sync referenced media asset from real CMS data (never inventing / never nulling).
  if (row.media_asset_id) {
    const synced = await syncMediaAssetDependency(
      supabase,
      row.media_asset_id,
      mediaAssetsById,
    );
    if (!synced.ok) return synced.response;
  }

  // 2) Sync referenced character from real CMS data (never inventing).
  if (row.character_id) {
    const synced = await syncCharacterDependency(
      supabase,
      row.character_id,
      charactersById,
    );
    if (!synced.ok) return synced.response;
  }

  // 3) Sync related products from real CMS data before linking.
  const relatedIds = [
    ...new Set(relationshipRows.map((r) => r.related_product_id)),
  ];
  for (const relatedId of relatedIds) {
    const synced = await syncRelatedProductDependency(
      supabase,
      relatedId,
      dependencyProductsById,
      charactersById,
      mediaAssetsById,
    );
    if (!synced.ok) return synced.response;
  }

  // 4) Safety: media FK must exist after sync (never invent).
  if (row.media_asset_id) {
    const { data: media, error: mediaError } = await supabase
      .from("media_assets")
      .select("id")
      .eq("id", row.media_asset_id)
      .maybeSingle();

    if (mediaError) {
      return safeServerError("Failed to verify media asset reference");
    }
    if (!media) {
      return conflict(
        `Referenced media asset "${row.media_asset_id}" does not exist in Supabase after sync.`,
      );
    }
  }

  // 5) Safety: character FK must exist after sync (never invent).
  if (row.character_id) {
    const { data: character, error: characterError } = await supabase
      .from("characters")
      .select("id")
      .eq("id", row.character_id)
      .maybeSingle();

    if (characterError) {
      return safeServerError("Failed to verify character reference");
    }
    if (!character) {
      return conflict(
        `Referenced character "${row.character_id}" does not exist in Supabase. Publish a matching character first, or remove the character on this product.`,
      );
    }
  }

  // 6) Safety: related product FKs must exist after sync.
  if (relatedIds.length > 0) {
    const { data: existingRelated, error: relatedError } = await supabase
      .from("products")
      .select("id")
      .in("id", relatedIds);

    if (relatedError) {
      return safeServerError("Failed to verify product relationships");
    }
    const found = new Set((existingRelated ?? []).map((r) => r.id as string));
    const missing = relatedIds.filter((id) => !found.has(id));
    if (missing.length > 0) {
      return conflict(
        `Related product(s) not found in Supabase: ${missing.join(", ")}. Publish those products first.`,
      );
    }
  }

  // 7) Upsert the current product (insert or update by CMS id).
  const { error: upsertError } = await supabase
    .from("products")
    .upsert(row, { onConflict: "id" });

  if (upsertError) {
    const message = upsertError.message?.includes("duplicate key")
      ? "A product with this slug already exists"
      : "Failed to save product to catalog";
    if (upsertError.code === "23505") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return safeServerError(message);
  }

  // 8) Replace relationships for this product only.
  const { error: deleteRelError } = await supabase
    .from("product_relationships")
    .delete()
    .eq("product_id", product.id);

  if (deleteRelError) {
    return safeServerError("Failed to update product relationships");
  }

  if (relationshipRows.length > 0) {
    const { error: insertRelError } = await supabase
      .from("product_relationships")
      .insert(relationshipRows);

    if (insertRelError) {
      return safeServerError("Failed to save product relationships");
    }
  }

  return NextResponse.json({
    ok: true,
    id: product.id,
    status: row.status,
  });
}
