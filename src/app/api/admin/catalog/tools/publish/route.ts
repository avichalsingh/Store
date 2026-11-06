import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  catalogRemotePublishGatedMessage,
  isCatalogRemotePublishEnabled,
} from "@/catalog/catalogRemotePublish";
import {
  adminToolToAiToolsRow,
  validateAdminToolForPublish,
} from "@/catalog/mapAdminToolToSupabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Upsert one AI tool into public.ai_tools.
 * Draft/inactive status removes the tool from catalog_ai_tools (active-only view).
 * Remote writes gated by CATALOG_REMOTE_PUBLISH=true.
 */

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function safeServerError(fallback: string) {
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const rawTool =
    body &&
    typeof body === "object" &&
    "tool" in body &&
    (body as { tool: unknown }).tool !== undefined
      ? (body as { tool: unknown }).tool
      : body;

  const validated = validateAdminToolForPublish(rawTool);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const row = adminToolToAiToolsRow(validated.tool);

  if (!isCatalogRemotePublishEnabled()) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      id: row.id,
      status: row.status,
      message: catalogRemotePublishGatedMessage("Tool"),
    });
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    return safeServerError("Server catalog publish is not configured");
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return safeServerError("Server catalog publish is not configured");
  }

  const { error: upsertError } = await supabase
    .from("ai_tools")
    .upsert(row, { onConflict: "id" });

  if (upsertError) {
    const message = upsertError.message?.includes("duplicate key")
      ? "A tool with this slug already exists"
      : "Failed to save tool to catalog";
    if (upsertError.code === "23505") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("[catalog/tools/publish]", upsertError.message);
    return safeServerError(message);
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    id: row.id,
    status: row.status,
  });
}
