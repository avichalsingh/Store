import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { createServiceClient } from "@/lib/supabase/admin";
import {
  createSignedMediaUploadAuthorization,
  ensureMediaBuckets,
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

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

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
    return NextResponse.json({ error: buckets.error }, { status: 500 });
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
