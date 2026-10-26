import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  MEDIA_FILE_SIZE_LIMIT_BYTES,
  createSignedMediaUploadAuthorization,
  ensureMediaBuckets,
  getMediaBucketFileSizeLimit,
  isAllowedMediaContentType,
  type MediaStorageKind,
} from "@/lib/supabase/mediaStorage";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Authorization only — no video bytes on this route. */
export const maxDuration = 30;

/** Direct/resumable path is for large video objects (master + preview). */
const DIRECT_KINDS = new Set<MediaStorageKind>(["master", "preview"]);

const MAX_BYTES = MEDIA_FILE_SIZE_LIMIT_BYTES;
function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Admin-authenticated signed/resumable upload authorization.
 * Returns a short-lived Storage token. Never returns the service-role key.
 * Never accepts a client-supplied bucket/path.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  const payload =
    body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  const productId = String(payload?.productId ?? "").trim();
  const mediaAssetId = String(payload?.mediaAssetId ?? "").trim();
  const kindRaw = String(payload?.kind ?? "").trim() as MediaStorageKind;
  const contentType = String(payload?.contentType ?? "").trim();
  const fileName = String(payload?.fileName ?? "").trim() || `${kindRaw}.bin`;
  const fileSize = Number(payload?.fileSize ?? 0);

  if (!productId || !mediaAssetId) {
    return badRequest("productId and mediaAssetId are required");
  }
  if (!DIRECT_KINDS.has(kindRaw)) {
    return badRequest(
      'kind must be "master" or "preview" for direct/resumable upload',
    );
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return badRequest("fileSize must be a positive number");
  }
  if (fileSize > MAX_BYTES) {
    return badRequest("file exceeds maximum upload size (500 MB)");
  }
  if (!isAllowedMediaContentType(kindRaw, contentType || "video/mp4")) {
    return badRequest(
      `Unsupported content type for ${kindRaw}: ${contentType || "(empty)"}`,
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
    // Typically: project global Storage limit < 500 MB blocks bucket fileSizeLimit.
    return NextResponse.json({ error: buckets.error }, { status: 500 });
  }

  const bucketLimit = await getMediaBucketFileSizeLimit(supabase, kindRaw);
  // When unset, Supabase still enforces the project global default (often 50 MB).
  const effectiveLimit = bucketLimit ?? 52_428_800;
  if (fileSize > effectiveLimit) {
    return NextResponse.json(
      {
        error: `File is ${fileSize} bytes but the effective Storage limit is ${effectiveLimit} bytes${
          bucketLimit === null ? " (project default; bucket limit unset)" : ""
        }. Raise the Supabase project global file size limit to at least 500 MB (Dashboard → Project Settings → Storage → Global file size limit), then retry. Bucket limits cannot exceed the project global limit.`,
      },
      { status: 413 },
    );
  }

  const authorized = await createSignedMediaUploadAuthorization(supabase, {
    productId,
    mediaAssetId,
    kind: kindRaw,
    fileName,
    contentType: contentType || "video/mp4",
  });
  if (!authorized.ok) {
    return NextResponse.json({ error: authorized.error }, { status: 500 });
  }

  const { auth } = authorized;
  return NextResponse.json({
    ok: true,
    kind: auth.kind,
    bucket: auth.bucket,
    path: auth.path,
    token: auth.token,
    signedUrl: auth.signedUrl,
    resumableEndpoint: auth.resumableEndpoint,
    contentType: auth.contentType,
    durableUrl: auth.durableUrl,
  });
}
