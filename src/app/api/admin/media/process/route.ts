import {
  ADMIN_SESSION_COOKIE,
  isAdminSessionTokenValid,
} from "@/admin/lib/adminSessionCookie";
import { dispatchWorkerProcess } from "@/lib/mediaProcessing/dispatchWorker";
import {
  loadMediaAssetRow,
  resolveMasterForProcessing,
  setMediaProcessingStatus,
} from "@/lib/mediaProcessing/resolveMaster";
import type { MediaProcessRequestBody } from "@/lib/mediaProcessing/types";
import { createServiceClient } from "@/lib/supabase/admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Control/dispatch only — FFmpeg runs on the dedicated worker.
 * Hold long enough for the worker round-trip on typical masters.
 */
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Admin-authenticated media processing enqueue/dispatch.
 * Never returns the service-role key, worker secret, or private master URL.
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

  // Persist queued → processing on existing rows; ignore if row not published yet.
  if (row) {
    try {
      const steps = {
        ...(row.processing_steps && typeof row.processing_steps === "object"
          ? row.processing_steps
          : {}),
        uploadComplete: true,
        previewGenerating: true,
        previewReady: false,
        watermarkApplying: true,
        watermarkReady: false,
        thumbnailExtracting: true,
        thumbnailReady: false,
      };
      await setMediaProcessingStatus(supabase, mediaAssetId, {
        processing_status: "queued",
        processing_error: null,
        processing_steps: steps,
      });
      await setMediaProcessingStatus(supabase, mediaAssetId, {
        processing_status: "processing",
        processing_error: null,
        processing_steps: steps,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to mark processing";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const workerResult = await dispatchWorkerProcess({
    mediaAssetId,
    productId: master.productId,
    masterBucket: master.bucket,
    masterPath: master.path,
    force,
  });

  if (!workerResult.ok) {
    if (row) {
      try {
        await setMediaProcessingStatus(supabase, mediaAssetId, {
          processing_status: "failed",
          processing_error: workerResult.error,
          processing_steps: {
            ...(row.processing_steps && typeof row.processing_steps === "object"
              ? row.processing_steps
              : {}),
            previewGenerating: false,
            previewReady: false,
            watermarkApplying: false,
            watermarkReady: false,
            thumbnailExtracting: false,
            thumbnailReady: false,
          },
        });
      } catch {
        // Best-effort failure status; surface worker error to Admin.
      }
    }
    return NextResponse.json(
      {
        ok: false,
        status: "failed",
        mediaAssetId,
        error: workerResult.error,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "ready",
    mediaAssetId,
    previewUrl: workerResult.previewUrl,
    thumbnailUrl: workerResult.thumbnailUrl,
    previewPath: workerResult.previewPath,
    thumbnailPath: workerResult.thumbnailPath,
    previewResolution: workerResult.previewResolution,
    skipped: workerResult.skipped ?? false,
    message: workerResult.skipped
      ? "Preview already ready"
      : "Preview generated",
  });
}
