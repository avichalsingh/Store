/**
 * Helpers for Save-triggered watermark preview refresh (Admin CMS only).
 * No DB migration — eligibility comes from in-memory mediaAssets.
 */

import {
  normalizeMediaAssetType,
  type MediaAsset,
} from "@/admin/types";

export type WatermarkRefreshProgress = {
  generation: number;
  total: number;
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  done: boolean;
};

export const WATERMARK_REFRESH_MAX_IN_FLIGHT = 2;

/** Durable master usable by the server process API (not a blob: draft). */
export function hasDurableMasterForRefresh(asset: MediaAsset): boolean {
  const url = asset.master?.url?.trim() ?? "";
  if (!url || url.startsWith("blob:")) return false;
  return url.includes("media-masters/") || /^https:\/\//i.test(url);
}

/**
 * Eligible CMS videos for post-Save refresh.
 * - Videos only (never images).
 * - Durable master required.
 * - Global watermark assets when watermark changed; quality change includes all videos.
 */
export function listEligibleVideoAssetsForWatermarkRefresh(
  assets: MediaAsset[],
  opts: { wmChanged: boolean; qualityChanged: boolean },
): MediaAsset[] {
  if (!opts.wmChanged && !opts.qualityChanged) return [];
  return assets.filter((asset) => {
    if (normalizeMediaAssetType(asset.type) !== "video") return false;
    if (!hasDurableMasterForRefresh(asset)) return false;
    if (opts.wmChanged && !opts.qualityChanged && asset.watermarkMode === "custom") {
      return false;
    }
    return true;
  });
}
