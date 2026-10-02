/**
 * Server-only helpers to resolve private masters and public preview paths
 * for Phase 5A processing. Never import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MEDIA_MASTERS_BUCKET,
  MEDIA_PREVIEWS_BUCKET,
} from "@/lib/supabase/mediaStorage";

export type ResolvedMaster = {
  bucket: string;
  path: string;
  productId: string;
};

export type MediaAssetProcessRow = {
  id: string;
  type: string;
  master_bucket: string | null;
  master_path: string | null;
  preview_bucket: string | null;
  preview_path: string | null;
  preview_url: string | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  processing_status: string | null;
  processing_steps: Record<string, unknown> | null;
  preview_playback: string | null;
  used_by_product_ids: string[] | null;
};

function sanitizeSegment(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** productId is the first path segment of master_path when present. */
export function productIdFromMasterPath(masterPath: string): string | null {
  const parts = masterPath.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  return parts[0] ?? null;
}

export async function loadMediaAssetRow(
  supabase: SupabaseClient,
  mediaAssetId: string,
): Promise<MediaAssetProcessRow | null> {
  const { data, error } = await supabase
    .from("media_assets")
    .select(
      "id, type, master_bucket, master_path, preview_bucket, preview_path, preview_url, thumbnail_path, thumbnail_url, processing_status, processing_steps, preview_playback, used_by_product_ids",
    )
    .eq("id", mediaAssetId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load media asset: ${error.message}`);
  }
  return (data as MediaAssetProcessRow | null) ?? null;
}

/**
 * Confirm a private master object exists. Never returns a signed/public master URL.
 */
export async function masterObjectExists(
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

/**
 * Resolve master location from DB row and/or productId + Storage listing.
 * Paths are always server-derived; client never supplies bucket/path.
 */
export async function resolveMasterForProcessing(
  supabase: SupabaseClient,
  options: {
    mediaAssetId: string;
    productIdHint?: string;
    row: MediaAssetProcessRow | null;
  },
): Promise<
  { ok: true; master: ResolvedMaster } | { ok: false; error: string }
> {
  const { mediaAssetId, productIdHint, row } = options;

  if (row?.type && row.type !== "video") {
    return { ok: false, error: "Only video media assets can be processed" };
  }

  const bucket =
    (row?.master_bucket?.trim() || MEDIA_MASTERS_BUCKET).trim() ||
    MEDIA_MASTERS_BUCKET;

  if (bucket !== MEDIA_MASTERS_BUCKET) {
    return {
      ok: false,
      error: "Master must live in the private media-masters bucket",
    };
  }

  if (row?.master_path?.trim()) {
    const path = row.master_path.trim();
    const exists = await masterObjectExists(supabase, bucket, path);
    if (!exists) {
      return {
        ok: false,
        error: "Private master object not found in Storage",
      };
    }
    // Canonical path is {productId}/{mediaAssetId}/master.<ext>.
    // Never let a client productId hint override the path-derived product.
    const productId =
      productIdFromMasterPath(path) ||
      productIdHint?.trim() ||
      row.used_by_product_ids?.[0]?.trim() ||
      "";
    if (!productId) {
      return {
        ok: false,
        error: "productId is required to process this media asset",
      };
    }
    return {
      ok: true,
      master: { bucket, path, productId },
    };
  }

  const productId =
    productIdHint?.trim() ||
    row?.used_by_product_ids?.[0]?.trim() ||
    "";
  if (!productId) {
    return {
      ok: false,
      error:
        "productId is required when media_assets has no durable master_path",
    };
  }

  const safeProduct = sanitizeSegment(productId);
  const safeAsset = sanitizeSegment(mediaAssetId);
  const folder = `${safeProduct}/${safeAsset}`;
  const { data: listed, error: listError } = await supabase.storage
    .from(MEDIA_MASTERS_BUCKET)
    .list(folder, { limit: 50 });

  if (listError) {
    return {
      ok: false,
      error: `Failed to list private masters: ${listError.message}`,
    };
  }

  const masterFile = listed?.find((f) => /^master\.[a-z0-9]+$/i.test(f.name));
  if (!masterFile) {
    return {
      ok: false,
      error:
        "No private master found in Storage — upload a durable master first",
    };
  }

  return {
    ok: true,
    master: {
      bucket: MEDIA_MASTERS_BUCKET,
      path: `${folder}/${masterFile.name}`,
      productId,
    },
  };
}

export function deterministicPreviewPaths(
  productId: string,
  mediaAssetId: string,
): { previewPath: string; thumbnailPath: string; previewBucket: string } {
  const safeProduct = sanitizeSegment(productId);
  const safeAsset = sanitizeSegment(mediaAssetId);
  // Phase 5A contract: deterministic preview.mp4 + thumb.jpg (retries overwrite).
  return {
    previewBucket: MEDIA_PREVIEWS_BUCKET,
    previewPath: `${safeProduct}/${safeAsset}/preview.mp4`,
    thumbnailPath: `${safeProduct}/${safeAsset}/thumb.jpg`,
  };
}

export async function setMediaProcessingStatus(
  supabase: SupabaseClient,
  mediaAssetId: string,
  patch: {
    processing_status: string;
    processing_error?: string | null;
    processing_steps?: Record<string, unknown>;
    preview_bucket?: string;
    preview_path?: string | null;
    preview_url?: string | null;
    thumbnail_path?: string | null;
    thumbnail_url?: string | null;
    preview_playback?: string;
    updated_at?: string;
  },
): Promise<void> {
  const { error } = await supabase
    .from("media_assets")
    .update({
      ...patch,
      updated_at: patch.updated_at ?? new Date().toISOString(),
    })
    .eq("id", mediaAssetId);

  if (error) {
    throw new Error(`Failed to update media_assets: ${error.message}`);
  }
}
