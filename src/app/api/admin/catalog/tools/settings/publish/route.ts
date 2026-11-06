import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  catalogRemotePublishGatedMessage,
  catalogPublishUserMessage,
  isCatalogRemotePublishEnabled,
} from "@/catalog/catalogRemotePublish";
import { normalizePublishedToolsSettings } from "@/catalog/mapAdminToolToSupabase";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Upsert published tools_settings singleton (disclosure + homepage deal rules).
 * Draft settings remain in Admin localStorage until this publish.
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

  const rawSettings =
    body &&
    typeof body === "object" &&
    "settings" in body &&
    (body as { settings: unknown }).settings !== undefined
      ? (body as { settings: unknown }).settings
      : body;

  const settings = normalizePublishedToolsSettings(rawSettings);

  if (!isCatalogRemotePublishEnabled()) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      id: "default",
      status: "active",
      message: catalogRemotePublishGatedMessage("Tools settings"),
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

  const { error } = await supabase.from("tools_settings").upsert(
    {
      id: "default",
      settings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[catalog/tools/settings/publish]", error.message);
    return safeServerError("Failed to save tools settings to catalog");
  }

  return NextResponse.json({
    ok: true,
    dryRun: false,
    id: "default",
    status: "active",
    message: catalogPublishUserMessage("Tools settings", "active", false),
  });
}
