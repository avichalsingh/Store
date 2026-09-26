/**
 * Map CMS MediaAsset → public.media_assets row shape.
 * Preserves the exact CMS id and fields — never invents a stub asset.
 */

import {
  normalizeMediaAssetType,
  type MediaAsset,
  type MediaProcessingStatus,
  type PreviewQuality,
} from "@/admin/types";

export type MediaAssetsTableRow = {
  id: string;
  name: string;
  original_file_name: string;
  type: "video" | "image";
  master_bucket: string;
  master_path: string;
  preview_bucket: string;
  preview_path: string | null;
  preview_url: string | null;
  thumbnail_path: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  size_label: string | null;
  resolution: string;
  duration: string;
  duration_seconds: number;
  processing_status: string;
  processing_error: string | null;
  processing_steps: Record<string, unknown>;
  watermark_mode: string;
  watermark_config: Record<string, unknown> | null;
  preview_quality: PreviewQuality | null;
  preview_playback: string;
  used_by_product_ids: string[];
  created_at: string;
  updated_at: string;
};

const PROCESSING_STATUSES = new Set<MediaProcessingStatus>([
  "queued",
  "uploading",
  "uploaded",
  "processing",
  "ready",
  "failed",
]);

function mimeFromAsset(asset: MediaAsset): string {
  const type = normalizeMediaAssetType(asset.type);
  const name = (asset.originalFileName || asset.master?.fileName || "").toLowerCase();
  if (type === "image") {
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
    if (name.endsWith(".webp")) return "image/webp";
    if (name.endsWith(".gif")) return "image/gif";
    return "image/png";
  }
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  return "video/mp4";
}

/**
 * Parse optional storage refs from a CMS URL without inventing cloud paths.
 * Durable site paths (e.g. /media/videos/…) stay in preview/thumbnail URL columns.
 */
function storageRefFromUrl(url: string | undefined | null): {
  bucket: string;
  path: string;
} {
  const raw = (url ?? "").trim();
  if (!raw) return { bucket: "", path: "" };
  // blob:/object: are runtime-only — not durable storage refs
  if (raw.startsWith("blob:") || raw.startsWith("blob%3A")) {
    return { bucket: "", path: "" };
  }
  const mastersPrefix = "media-masters/";
  const previewsPrefix = "media-previews/";
  if (raw.includes(mastersPrefix)) {
    const path = raw.slice(raw.indexOf(mastersPrefix) + mastersPrefix.length);
    return { bucket: "media-masters", path };
  }
  if (raw.includes(previewsPrefix)) {
    const path = raw.slice(raw.indexOf(previewsPrefix) + previewsPrefix.length);
    return { bucket: "media-previews", path };
  }
  return { bucket: "", path: "" };
}

function durablePublicUrl(url: string | undefined | null): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("blob:") || raw.startsWith("blob%3A")) return null;
  return raw;
}

export function validateAdminMediaAssetForPublish(
  asset: unknown,
): { ok: true; asset: MediaAsset } | { ok: false; error: string } {
  if (!asset || typeof asset !== "object") {
    return { ok: false, error: "Invalid media asset payload" };
  }
  const a = asset as Partial<MediaAsset>;
  if (!a.id || typeof a.id !== "string" || !a.id.trim()) {
    return { ok: false, error: "Media asset id is required" };
  }
  if (!a.name || typeof a.name !== "string" || !a.name.trim()) {
    return { ok: false, error: "Media asset name is required" };
  }
  if (!a.originalFileName || typeof a.originalFileName !== "string") {
    return { ok: false, error: "Media asset originalFileName is required" };
  }
  if (!a.master || typeof a.master !== "object") {
    return { ok: false, error: "Media asset master file is required" };
  }
  if (!a.preview || typeof a.preview !== "object") {
    return { ok: false, error: "Media asset preview file is required" };
  }
  if (!a.thumbnail || typeof a.thumbnail !== "object") {
    return { ok: false, error: "Media asset thumbnail is required" };
  }
  if (!a.processingStatus || !PROCESSING_STATUSES.has(a.processingStatus)) {
    return { ok: false, error: "Invalid or missing media processing status" };
  }
  if (a.watermarkMode !== "global" && a.watermarkMode !== "custom") {
    return { ok: false, error: "Invalid or missing media watermark mode" };
  }
  return { ok: true, asset: a as MediaAsset };
}

/** Map the full CMS media asset — preserve exact id (e.g. media-pulse-drop). */
export function adminMediaAssetToMediaAssetsRow(
  asset: MediaAsset,
): MediaAssetsTableRow {
  const type = normalizeMediaAssetType(asset.type);
  const masterRef = storageRefFromUrl(asset.master?.url);
  const previewRef = storageRefFromUrl(asset.preview?.url);

  return {
    id: asset.id.trim(),
    name: asset.name.trim(),
    original_file_name: asset.originalFileName.trim(),
    type,
    master_bucket: masterRef.bucket,
    master_path: masterRef.path,
    preview_bucket: previewRef.bucket || "",
    preview_path: previewRef.path || null,
    preview_url: durablePublicUrl(asset.preview?.url),
    thumbnail_path: null,
    thumbnail_url: durablePublicUrl(asset.thumbnail?.url),
    mime_type: mimeFromAsset(asset),
    size_bytes:
      typeof asset.master?.sizeBytes === "number" ? asset.master.sizeBytes : null,
    size_label: asset.master?.sizeLabel?.trim() || null,
    resolution: asset.master?.resolution?.trim() || "",
    duration: asset.master?.duration?.trim() || "",
    duration_seconds:
      typeof asset.master?.durationSeconds === "number"
        ? asset.master.durationSeconds
        : 0,
    processing_status: asset.processingStatus,
    processing_error: asset.processingError?.trim() || null,
    processing_steps:
      asset.processingSteps && typeof asset.processingSteps === "object"
        ? (asset.processingSteps as unknown as Record<string, unknown>)
        : {},
    watermark_mode: asset.watermarkMode,
    watermark_config:
      asset.watermarkConfig && typeof asset.watermarkConfig === "object"
        ? (asset.watermarkConfig as unknown as Record<string, unknown>)
        : null,
    preview_quality: asset.previewQuality ?? asset.preview?.quality ?? null,
    preview_playback: asset.previewPlayback ?? "none",
    used_by_product_ids: Array.isArray(asset.usedByProductIds)
      ? asset.usedByProductIds
      : [],
    created_at: asset.createdAt || new Date().toISOString(),
    updated_at: asset.updatedAt || new Date().toISOString(),
  };
}
