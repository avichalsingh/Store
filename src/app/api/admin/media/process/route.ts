import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { enqueueWorkerProcess } from "@/lib/mediaProcessing/dispatchWorker";
import {
  ensureMediaAssetRowForProcessing,
  loadMediaAssetRow,
  resolveMasterForProcessing,
  setMediaProcessingStatus,
} from "@/lib/mediaProcessing/resolveMaster";
import type { MediaProcessRequestBody } from "@/lib/mediaProcessing/types";
import { sanitizeWorkerWatermark } from "@/lib/mediaProcessing/watermarkConfig";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Control/enqueue only — FFmpeg runs on the dedicated long-lived worker.
 * Returns quickly after the worker accepts the job (does not wait for encode).
 */
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Admin-authenticated media processing enqueue.
 * Never returns the service-role key, worker secret, or private master URL.
 * Client polls GET /api/admin/media/status for ready/failed + public URLs.
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
    body && typeof body === "object"
      ? (body as MediaProcessRequestBody)
      : null;

  const mediaAssetId = String(payload?.mediaAssetId ?? "").trim();
  const productIdHint = String(payload?.productId ?? "").trim() || undefined;
  const force = Boolean(payload?.force);
  const sanitized = sanitizeWorkerWatermark(payload?.watermark);
  if (!sanitized.ok) {
    return badRequest(sanitized.error);
  }
  const watermark = sanitized.watermark;

  if (!mediaAssetId) {
    return badRequest("mediaAssetId is required");
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

  let row;
  try {
    row = await loadMediaAssetRow(supabase, mediaAssetId);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load media asset";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  if (row?.processing_status === "processing" && !force) {
    return NextResponse.json(
      {
        ok: true,
        status: "processing",
        mediaAssetId,
        message: "Processing already in progress",
      },
      { status: 202 },
    );
  }

  if (
    !force &&
    row?.processing_status === "ready" &&
    row.preview_url &&
    row.thumbnail_url &&
    row.preview_playback === "generated"
  ) {
    return NextResponse.json({
      ok: true,
      status: "ready",
      mediaAssetId,
      previewUrl: row.preview_url,
      thumbnailUrl: row.thumbnail_url,
      skipped: true,
      message: "Preview already ready",
    });
  }

  const resolved = await resolveMasterForProcessing(supabase, {
    mediaAssetId,
    productIdHint,
    row,
  });
  if (!resolved.ok) {
    return badRequest(resolved.error);
  }

  const { master } = resolved;

  try {
    await ensureMediaAssetRowForProcessing(supabase, {
      mediaAssetId,
      master,
      existing: row,
      usedByProductId: productIdHint,
    });
    await setMediaProcessingStatus(supabase, mediaAssetId, {
      processing_status: "processing",
      processing_error: null,
      processing_steps: {
        uploadComplete: true,
        previewGenerating: true,
        previewReady: false,
        watermarkApplying: true,
        watermarkReady: false,
        thumbnailExtracting: true,
        thumbnailReady: false,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mark processing";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const enqueue = await enqueueWorkerProcess({
    mediaAssetId,
    productId: master.productId,
    masterBucket: master.bucket,
    masterPath: master.path,
    force,
    watermark,
  });

  if (!enqueue.ok) {
    try {
      await setMediaProcessingStatus(supabase, mediaAssetId, {
        processing_status: "failed",
        processing_error: enqueue.error,
        processing_steps: {
          uploadComplete: true,
          previewGenerating: false,
          previewReady: false,
          watermarkApplying: false,
          watermarkReady: false,
          thumbnailExtracting: false,
          thumbnailReady: false,
        },
      });
    } catch {
      // Best-effort failure status.
    }
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        mediaAssetId,
        error: enqueue.error,
      },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      status: enqueue.status,
      mediaAssetId,
      accepted: true,
      message:
        enqueue.message ||
        "Preview job accepted — poll status until ready",
    },
    { status: 202 },
  );
}
