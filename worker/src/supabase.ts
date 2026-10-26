import { createWriteStream } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  WATERMARK_LOGO_BUCKET,
  isAllowedWatermarkLogoPath,
} from "./watermark.js";

export const MEDIA_MASTERS_BUCKET = "media-masters";
export const MEDIA_PREVIEWS_BUCKET = "media-previews";

/** Matches CUSTOMER_PREVIEW_MAX_SECONDS in the Next app previewEncoder. */
export const CUSTOMER_PREVIEW_MAX_SECONDS = 8;

/** Short-lived signed URL for worker-only master download (never sent to browsers). */
const MASTER_SIGNED_URL_SECONDS = 60 * 30; // 30 minutes

export function createWorkerSupabase(
  url: string,
  serviceRoleKey: string,
): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function deterministicOutputPaths(
  productId: string,
  mediaAssetId: string,
): { previewPath: string; thumbnailPath: string } {
  const safeProduct = sanitizeSegment(productId);
  const safeAsset = sanitizeSegment(mediaAssetId);
  return {
    previewPath: `${safeProduct}/${safeAsset}/preview.mp4`,
    thumbnailPath: `${safeProduct}/${safeAsset}/thumb.jpg`,
  };
}

/**
 * Stream a private master from Storage to disk.
 * Uses a short-lived signed URL + fetch body stream — never buffers the whole file.
 * Signed URL stays on the worker; never returned to browsers.
 */
export async function downloadMasterToFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  destFile: string,
): Promise<void> {
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, MASTER_SIGNED_URL_SECONDS);

  if (signError || !signed?.signedUrl) {
    throw new Error(
      `Failed to sign private master download: ${signError?.message ?? "empty"}`,
    );
  }

  let response: Response;
  try {
    response = await fetch(signed.signedUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    throw new Error(`Failed to download private master: ${message}`);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to download private master: HTTP ${response.status}`,
    );
  }
  if (!response.body) {
    throw new Error("Failed to download private master: empty response body");
  }

  const nodeStream = Readable.fromWeb(
    response.body as import("node:stream/web").ReadableStream,
  );
  const fileStream = createWriteStream(destFile);

  try {
    await pipeline(nodeStream, fileStream);
  } catch (err) {
    await unlink(destFile).catch(() => undefined);
    const message = err instanceof Error ? err.message : "stream failed";
    throw new Error(`Failed to stream private master to disk: ${message}`);
  }
}

/**
 * Download the allowlisted watermark logo from private Storage to a temp file.
 * Never accepts arbitrary buckets/URLs — path must match system/watermark-logo.(png|webp).
 */
export async function downloadWatermarkLogoToFile(
  supabase: SupabaseClient,
  path: string,
  destFile: string,
): Promise<void> {
  const safePath = path.trim();
  if (!isAllowedWatermarkLogoPath(safePath)) {
    throw new Error("Invalid watermark logo path");
  }
  const { data, error } = await supabase.storage
    .from(WATERMARK_LOGO_BUCKET)
    .download(safePath);
  if (error || !data) {
    throw new Error(
      `Failed to download watermark logo: ${error?.message ?? "object missing"}`,
    );
  }
  const buf = Buffer.from(await data.arrayBuffer());
  if (buf.byteLength <= 0) {
    throw new Error("Watermark logo object is empty");
  }
  await writeFile(destFile, buf);
}

export async function uploadPublicObject(
  supabase: SupabaseClient,
  path: string,
  filePath: string,
  contentType: string,
): Promise<{ path: string; publicUrl: string }> {
  const fs = await import("node:fs/promises");
  const bytes = await fs.readFile(filePath);
  const { error } = await supabase.storage
    .from(MEDIA_PREVIEWS_BUCKET)
    .upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });
  if (error) {
    throw new Error(`Failed to upload ${path}: ${error.message}`);
  }
  const { data } = supabase.storage
    .from(MEDIA_PREVIEWS_BUCKET)
    .getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function publicObjectsExist(
  supabase: SupabaseClient,
  previewPath: string,
  thumbnailPath: string,
): Promise<boolean> {
  const previewOk = await objectExists(
    supabase,
    MEDIA_PREVIEWS_BUCKET,
    previewPath,
  );
  const thumbOk = await objectExists(
    supabase,
    MEDIA_PREVIEWS_BUCKET,
    thumbnailPath,
  );
  return previewOk && thumbOk;
}

async function objectExists(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<boolean> {
  const slash = path.lastIndexOf("/");
  const folder = slash >= 0 ? path.slice(0, slash) : "";
  const fileName = slash >= 0 ? path.slice(slash + 1) : path;
  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    search: fileName,
    limit: 20,
  });
  if (error) return false;
  return Boolean(data?.some((f) => f.name === fileName));
}

export type MediaAssetUpdate = {
  processing_status: string;
  processing_error: string | null;
  processing_steps: Record<string, unknown>;
  preview_bucket?: string;
  preview_path?: string | null;
  preview_url?: string | null;
  thumbnail_path?: string | null;
  thumbnail_url?: string | null;
  preview_playback?: string;
  resolution?: string;
  updated_at: string;
};

export async function updateMediaAssetRow(
  supabase: SupabaseClient,
  mediaAssetId: string,
  patch: MediaAssetUpdate,
): Promise<void> {
  const { error, count } = await supabase
    .from("media_assets")
    .update(patch, { count: "exact" })
    .eq("id", mediaAssetId);

  if (error) {
    throw new Error(`Failed to update media_assets: ${error.message}`);
  }
  // count may be null depending on client options — absence of error is enough.
  void count;
}
