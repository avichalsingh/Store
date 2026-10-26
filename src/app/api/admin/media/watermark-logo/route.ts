import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import {
  WATERMARK_LOGO_ADMIN_DISPLAY_PATH,
  WATERMARK_LOGO_BUCKET,
  WATERMARK_LOGO_CONTENT_TYPES,
  WATERMARK_LOGO_MAX_BYTES,
  isAllowedWatermarkLogoPath,
  watermarkLogoPathForContentType,
} from "@/lib/mediaProcessing/watermarkLogo";
import { createServiceClient } from "@/lib/supabase/admin";
import { ensureMediaBuckets } from "@/lib/supabase/mediaStorage";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return isAdminSessionTokenValid(sessionToken);
}

/**
 * POST: upload PNG/WebP watermark logo to the fixed private Storage path.
 * GET: stream the logo for Admin Settings preview (session cookie).
 * DELETE: remove the stored logo.
 * Never returns the service-role key. Never accepts client bucket/path.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) return unauthorized();

  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  ) {
    return NextResponse.json(
      { error: "Server media storage is not configured" },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Invalid multipart body");
  }

  const file = form.get("file");
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as Blob).arrayBuffer !== "function"
  ) {
    return badRequest("file is required");
  }

  const blob = file as Blob;
  if (blob.size <= 0) return badRequest("file is empty");
  if (blob.size > WATERMARK_LOGO_MAX_BYTES) {
    return badRequest("Watermark logo exceeds 2 MB limit");
  }

  const contentType = (blob.type || "application/octet-stream").toLowerCase();
  if (!WATERMARK_LOGO_CONTENT_TYPES.has(contentType)) {
    return badRequest("Watermark logo must be image/png or image/webp");
  }

  const path = watermarkLogoPathForContentType(contentType);
  if (!isAllowedWatermarkLogoPath(path)) {
    return NextResponse.json(
      { error: "Internal logo path rejected" },
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

  const buckets = await ensureMediaBuckets(supabase);
  if (!buckets.ok) {
    return NextResponse.json({ error: buckets.error }, { status: 500 });
  }

  const bytes = Buffer.from(await blob.arrayBuffer());

  // Remove alternate extension so only one logo object exists.
  const otherPath =
    path.endsWith(".png")
      ? "system/watermark-logo.webp"
      : "system/watermark-logo.png";
  await supabase.storage.from(WATERMARK_LOGO_BUCKET).remove([otherPath]);

  const { error } = await supabase.storage
    .from(WATERMARK_LOGO_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });

  if (error) {
    return NextResponse.json(
      { error: `Failed to store watermark logo: ${error.message}` },
      { status: 502 },
    );
  }

  const fileName =
    typeof File !== "undefined" && file instanceof File && file.name
      ? file.name
      : path.split("/").pop() || "watermark-logo";

  return NextResponse.json({
    ok: true,
    bucket: WATERMARK_LOGO_BUCKET,
    path,
    contentType,
    imageName: fileName,
    /** Same-origin Admin display path (requires session cookie). */
    displayUrl: WATERMARK_LOGO_ADMIN_DISPLAY_PATH,
  });
}

export async function GET() {
  if (!(await requireAdmin())) return unauthorized();

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

  for (const path of [
    "system/watermark-logo.png",
    "system/watermark-logo.webp",
  ]) {
    const { data, error } = await supabase.storage
      .from(WATERMARK_LOGO_BUCKET)
      .download(path);
    if (error || !data) continue;
    const buf = Buffer.from(await data.arrayBuffer());
    const contentType = path.endsWith(".webp") ? "image/webp" : "image/png";
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  }

  return NextResponse.json({ error: "Watermark logo not found" }, { status: 404 });
}

export async function DELETE() {
  if (!(await requireAdmin())) return unauthorized();

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

  await supabase.storage
    .from(WATERMARK_LOGO_BUCKET)
    .remove(["system/watermark-logo.png", "system/watermark-logo.webp"]);

  return NextResponse.json({ ok: true });
}
