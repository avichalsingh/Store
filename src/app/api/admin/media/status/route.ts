import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { isPublicCustomerMediaUrl } from "@/admin/lib/mediaPreview";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Admin poll endpoint for async preview jobs.
 * Returns public preview/thumbnail URLs only — never master paths or secrets.
 */
export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isAdminSessionTokenValid(sessionToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const mediaAssetId = new URL(request.url).searchParams
    .get("mediaAssetId")
    ?.trim();
  if (!mediaAssetId) {
    return NextResponse.json(
      { error: "mediaAssetId is required" },
      { status: 400 },
    );
  }

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    return NextResponse.json(
      { error: "Server media storage is not configured" },
      { status: 500 },
    );
  }

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Server media storage is not configured" },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id, processing_status, processing_error, preview_playback, preview_url, thumbnail_url",
    )
    .eq("id", mediaAssetId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to load media status" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        ok: true,
        mediaAssetId,
        status: "missing",
        message: "No media_assets row yet",
      },
      { status: 200 },
    );
  }

  const status = String(data.processing_status || "uploaded");
  const previewUrl = isPublicCustomerMediaUrl(data.preview_url)
    ? String(data.preview_url).trim()
    : undefined;
  const thumbnailUrl = isPublicCustomerMediaUrl(data.thumbnail_url)
    ? String(data.thumbnail_url).trim()
    : undefined;

  return NextResponse.json({
    ok: true,
    mediaAssetId: data.id,
    status,
    previewPlayback: data.preview_playback ?? "none",
    previewUrl,
    thumbnailUrl,
    error:
      status === "failed" && data.processing_error
        ? String(data.processing_error)
        : undefined,
  });
}
