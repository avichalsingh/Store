import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  adminProductToProductsRow,
  adminRelationshipsToRows,
  validateAdminProductForPublish,
} from "@/catalog/mapAdminProductToSupabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function safeServerError(fallback: string) {
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/**
 * Upsert a CMS product into public.products (+ replace its relationships).
 * Auth: httpOnly cookie derived from ADMIN_API_SECRET.
 * DB: service-role client (server-only). Storefront still reads via catalog_* views.
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

  const rawProduct =
    body &&
    typeof body === "object" &&
    "product" in body &&
    (body as { product: unknown }).product !== undefined
      ? (body as { product: unknown }).product
      : body;

  const validated = validateAdminProductForPublish(rawProduct);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const product = validated.product;
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

  // Character FK: require existing row — never invent characters.
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
      return NextResponse.json(
        {
          error: `Referenced character "${row.character_id}" does not exist in Supabase. Publish a matching character first, or remove the character on this product.`,
        },
        { status: 409 },
      );
    }
  }

  // Related products must already exist (no inventing).
  if (relationshipRows.length > 0) {
    const relatedIds = [
      ...new Set(relationshipRows.map((r) => r.related_product_id)),
    ];
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
      return NextResponse.json(
        {
          error: `Related product(s) not found in Supabase: ${missing.join(", ")}. Publish those products first.`,
        },
        { status: 409 },
      );
    }
  }

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

  // Replace relationships for this product only.
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
