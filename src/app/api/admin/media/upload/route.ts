import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  ensureMediaBuckets,
  isAllowedMediaContentType,
  uploadMediaObject,
  type MediaStorageKind,
} from "@/lib/supabase/mediaStorage";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Allow large master uploads (Vercel plan limits still apply at the edge). */
export const maxDuration = 60;

const KINDS = new Set<MediaStorageKind>(["master", "preview", "thumbnail"]);

/** Small-file proxy only — large video masters/previews must use /upload-url + TUS. */
const PROXY_KINDS = new Set<MediaStorageKind>(["thumbnail"]);

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Authenticated Admin media upload → Supabase Storage (service role).
 * Browser sends Blob bytes; never accepts blob: URL strings as content.
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

  const productId = String(form.get("productId") ?? "").trim();
  const mediaAssetId = String(form.get("mediaAssetId") ?? "").trim();
  const kindRaw = String(form.get("kind") ?? "").trim() as MediaStorageKind;
  const file = form.get("file");

  if (!productId || !mediaAssetId) {
    return badRequest("productId and mediaAssetId are required");
  }
  if (!KINDS.has(kindRaw)) {
    return badRequest('kind must be "master", "preview", or "thumbnail"');
  }
  if (!PROXY_KINDS.has(kindRaw)) {
    return badRequest(
      `Large "${kindRaw}" uploads must use /api/admin/media/upload-url (direct/resumable). This route accepts thumbnails only.`,
    );
  }
  if (
    !file ||
    typeof file === "string" ||
    typeof (file as Blob).arrayBuffer !== "function"
  ) {
    return badRequest("file is required");
  }

  const blob = file as Blob;
  if (blob.size <= 0) {
    return badRequest("file is empty");
  }
  if (blob.size > MAX_BYTES) {
    return badRequest("file exceeds maximum upload size (500 MB)");
  }

  const fileName =
    typeof File !== "undefined" && file instanceof File && file.name
      ? file.name
      : `${kindRaw}.bin`;
  const contentType =
    blob.type ||
    (kindRaw === "thumbnail" ? "image/jpeg" : "video/mp4");

  if (!isAllowedMediaContentType(kindRaw, contentType)) {
    return badRequest(`Unsupported content type for ${kindRaw}: ${contentType}`);
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

  const bytes = await blob.arrayBuffer();
  const uploaded = await uploadMediaObject(supabase, {
    productId,
    mediaAssetId,
    kind: kindRaw,
    bytes,
    fileName,
    contentType,
  });

  if (!uploaded.ok) {
    return NextResponse.json({ error: uploaded.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    kind: uploaded.object.kind,
    bucket: uploaded.object.bucket,
    path: uploaded.object.path,
    url: uploaded.object.url,
  });
}
