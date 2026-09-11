import type { AdminProductMedia, MediaAsset } from "@/admin/types";

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function formatTimestamp(seconds: number): string {
  const total = Math.max(0, seconds);
  const m = Math.floor(total / 60);
  const rem = total % 60;
  const whole = Math.floor(rem);
  const tenths = Math.round((rem - whole) * 10);
  return `${String(m).padStart(2, "0")}:${String(whole).padStart(2, "0")}.${tenths}`;
}

export function parseDurationLabel(label: string): number {
  const parts = label.split(":").map(Number);
  if (parts.length === 2 && parts.every((n) => !Number.isNaN(n))) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 15;
}

export function parseSizeLabel(label?: string): number {
  if (!label) return 12_000_000;
  const match = label.trim().match(/^([\d.]+)\s*(KB|MB|GB)$/i);
  if (!match) return 12_000_000;
  const n = Number(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === "KB") return Math.round(n * 1024);
  if (unit === "GB") return Math.round(n * 1024 * 1024 * 1024);
  return Math.round(n * 1024 * 1024);
}

export function formatSizeBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function assetToProductMedia(asset: MediaAsset): AdminProductMedia {
  // Admin adapter: thumbnail stays clean (master / clean poster).
  // Storefront watermarked visuals come from asset.preview via mapAdminToStorefront.
  const cleanThumb =
    asset.thumbnail.url && asset.thumbnail.url !== asset.preview.url
      ? asset.thumbnail.url
      : asset.master.url || asset.thumbnail.url || "";
  return {
    thumbnail: cleanThumb,
    previewVideo: asset.preview.url || undefined,
    downloadFileName: asset.master.fileName,
    downloadFileSize: asset.master.sizeLabel,
  };
}

export const READY_PROCESSING_STEPS = {
  uploadComplete: true,
  previewGenerating: false,
  previewReady: true,
  watermarkApplying: false,
  watermarkReady: true,
  thumbnailExtracting: false,
  thumbnailReady: true,
} as const;

export const EMPTY_PROCESSING_STEPS = {
  uploadComplete: false,
  previewGenerating: false,
  previewReady: false,
  watermarkApplying: false,
  watermarkReady: false,
  thumbnailExtracting: false,
  thumbnailReady: false,
} as const;
