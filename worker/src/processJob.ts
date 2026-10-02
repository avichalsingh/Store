import { mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateCustomerPreview, generateThumbnail } from "./ffmpeg.js";
import {
  MEDIA_MASTERS_BUCKET,
  MEDIA_PREVIEWS_BUCKET,
  createWorkerSupabase,
  deterministicOutputPaths,
  downloadMasterToFile,
  publicObjectsExist,
  updateMediaAssetRow,
  uploadPublicObject,
} from "./supabase.js";

export type WorkerProcessPayload = {
  mediaAssetId: string;
  productId: string;
  masterBucket: string;
  masterPath: string;
  force?: boolean;
};

export type WorkerProcessResult =
  | {
      ok: true;
      mediaAssetId: string;
      previewUrl: string;
      previewPath: string;
      thumbnailUrl: string;
      thumbnailPath: string;
      previewResolution: string;
      skipped?: boolean;
    }
  | {
      ok: false;
      error: string;
    };

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function markFailed(
  supabase: SupabaseClient,
  mediaAssetId: string,
  error: string,
): Promise<void> {
  try {
    await updateMediaAssetRow(supabase, mediaAssetId, {
      processing_status: "failed",
      processing_error: error.slice(0, 2000),
      processing_steps: {
        uploadComplete: true,
        previewGenerating: false,
        previewReady: false,
        watermarkApplying: false,
        watermarkReady: false,
        thumbnailExtracting: false,
        thumbnailReady: false,
      },
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Best-effort — surface original error to caller.
  }
}

/**
 * Execute one idempotent processing job for a mediaAssetId.
 * Never marks ready unless both preview.mp4 and thumb.jpg exist in public storage.
 */
export async function processMediaJob(
  supabase: SupabaseClient,
  payload: WorkerProcessPayload,
): Promise<WorkerProcessResult> {
  const mediaAssetId = payload.mediaAssetId.trim();
  const productId = payload.productId.trim();
  const masterBucket = payload.masterBucket.trim() || MEDIA_MASTERS_BUCKET;
  const masterPath = payload.masterPath.trim();
  const force = Boolean(payload.force);

  if (!mediaAssetId || !productId || !masterPath) {
    return {
      ok: false,
      error: "mediaAssetId, productId, and masterPath are required",
    };
  }
  if (masterBucket !== MEDIA_MASTERS_BUCKET) {
    return {
      ok: false,
      error: "masterBucket must be the private media-masters bucket",
    };
  }

  const { previewPath, thumbnailPath } = deterministicOutputPaths(
    productId,
    mediaAssetId,
  );

  if (!force) {
    const already = await publicObjectsExist(
      supabase,
      previewPath,
      thumbnailPath,
    );
    if (already) {
      const previewPub = supabase.storage
        .from(MEDIA_PREVIEWS_BUCKET)
        .getPublicUrl(previewPath);
      const thumbPub = supabase.storage
        .from(MEDIA_PREVIEWS_BUCKET)
        .getPublicUrl(thumbnailPath);
      try {
        await updateMediaAssetRow(supabase, mediaAssetId, {
          processing_status: "ready",
          processing_error: null,
          processing_steps: {
            uploadComplete: true,
            previewGenerating: false,
            previewReady: true,
            watermarkApplying: false,
            watermarkReady: true,
            thumbnailExtracting: false,
            thumbnailReady: true,
          },
          preview_bucket: MEDIA_PREVIEWS_BUCKET,
          preview_path: previewPath,
          preview_url: previewPub.data.publicUrl,
          thumbnail_path: thumbnailPath,
          thumbnail_url: thumbPub.data.publicUrl,
          preview_playback: "generated",
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Row may not exist yet — still return durable URLs for Admin CMS.
      }
      return {
        ok: true,
        mediaAssetId,
        previewUrl: previewPub.data.publicUrl,
        previewPath,
        thumbnailUrl: thumbPub.data.publicUrl,
        thumbnailPath,
        previewResolution: "<=540x960",
        skipped: true,
      };
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), "rhythm-media-"));
  const masterFile = join(workDir, "master.bin");
  const previewFile = join(workDir, "preview.mp4");
  const thumbFile = join(workDir, "thumb.jpg");

  try {
    await downloadMasterToFile(supabase, masterBucket, masterPath, masterFile);

    const { resolution } = await generateCustomerPreview({
      masterFile,
      previewFile,
      thumbFile,
    });
    await generateThumbnail({ masterFile, previewFile, thumbFile });

    if (!(await fileExists(previewFile)) || !(await fileExists(thumbFile))) {
      throw new Error("FFmpeg did not produce both required output files");
    }

    const previewUpload = await uploadPublicObject(
      supabase,
      previewPath,
      previewFile,
      "video/mp4",
    );
    const thumbUpload = await uploadPublicObject(
      supabase,
      thumbnailPath,
      thumbFile,
      "image/jpeg",
    );

    // Final existence check before ready — never mark ready without both objects.
    const bothExist = await publicObjectsExist(
      supabase,
      previewPath,
      thumbnailPath,
    );
    if (!bothExist) {
      throw new Error(
        "Public preview outputs missing after upload — not marking ready",
      );
    }

    try {
      await updateMediaAssetRow(supabase, mediaAssetId, {
        processing_status: "ready",
        processing_error: null,
        processing_steps: {
          uploadComplete: true,
          previewGenerating: false,
          previewReady: true,
          watermarkApplying: false,
          watermarkReady: true,
          thumbnailExtracting: false,
          thumbnailReady: true,
        },
        preview_bucket: MEDIA_PREVIEWS_BUCKET,
        preview_path: previewUpload.path,
        preview_url: previewUpload.publicUrl,
        thumbnail_path: thumbUpload.path,
        thumbnail_url: thumbUpload.publicUrl,
        preview_playback: "generated",
        resolution,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // Outputs are durable; Admin CMS can still apply returned URLs.
    }

    return {
      ok: true,
      mediaAssetId,
      previewUrl: previewUpload.publicUrl,
      previewPath: previewUpload.path,
      thumbnailUrl: thumbUpload.publicUrl,
      thumbnailPath: thumbUpload.path,
      previewResolution: resolution,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Processing failed";
    await markFailed(supabase, mediaAssetId, message);
    return { ok: false, error: message };
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export function createJobRunner(url: string, serviceRoleKey: string) {
  const supabase = createWorkerSupabase(url, serviceRoleKey);
  return (payload: WorkerProcessPayload) => processMediaJob(supabase, payload);
}
