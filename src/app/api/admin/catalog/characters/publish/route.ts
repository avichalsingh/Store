import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  adminCharacterToCharactersRow,
  validateAdminCharacterForPublish,
} from "@/catalog/mapAdminCharacterToSupabase";
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
 * Upsert a CMS character into public.characters.
 * Auth: httpOnly cookie derived from ADMIN_API_SECRET.
 * DB: service-role client (server-only). Preserves exact CMS character id.
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

  const rawCharacter =
    body &&
    typeof body === "object" &&
    "character" in body &&
    (body as { character: unknown }).character !== undefined
      ? (body as { character: unknown }).character
      : body;

  const validated = validateAdminCharacterForPublish(rawCharacter);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const row = adminCharacterToCharactersRow(validated.character);

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return safeServerError("Server catalog publish is not configured");
  }

  const { error: upsertError } = await supabase
    .from("characters")
    .upsert(row, { onConflict: "id" });

  if (upsertError) {
    const message = upsertError.message?.includes("duplicate key")
      ? "A character with this slug already exists"
      : "Failed to save character to catalog";
    if (upsertError.code === "23505") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("[catalog/characters/publish]", upsertError.message);
    return safeServerError(message);
  }

  return NextResponse.json({
    ok: true,
    id: row.id,
    status: row.status,
  });
}
