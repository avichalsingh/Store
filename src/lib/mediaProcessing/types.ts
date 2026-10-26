/**
 * Server ↔ worker contract for Phase 5A customer preview processing.
 * Never import WORKER_SHARED_SECRET or service-role into client code.
 */

import type { WorkerWatermarkConfig } from "./watermarkConfig";

export type {
  SanitizeWatermarkResult,
  WorkerWatermarkConfig,
} from "./watermarkConfig";
export {
  DEFAULT_WORKER_WATERMARK,
  sanitizeWorkerWatermark,
} from "./watermarkConfig";

export type MediaProcessRequestBody = {
  mediaAssetId: string;
  /** When media_assets row lacks path, server builds path with productId. */
  productId?: string;
  /** Re-run even if already ready. */
  force?: boolean;
  /**
   * Effective watermark (global or per-asset custom) from Admin CMS.
   * Sanitized server-side before worker dispatch.
   */
  watermark?: WorkerWatermarkConfig;
};

export type WorkerProcessPayload = {
  mediaAssetId: string;
  productId: string;
  masterBucket: string;
  masterPath: string;
  force?: boolean;
  /** Prefer true — worker returns 202 and processes in background. */
  async?: boolean;
  /** Sanitized watermark applied during FFmpeg preview encode. */
  watermark?: WorkerWatermarkConfig;
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

/** Immediate ack from async worker enqueue (no preview URLs yet). */
export type WorkerEnqueueResult =
  | {
      ok: true;
      accepted: true;
      status: "queued" | "processing";
      mediaAssetId: string;
      message?: string;
    }
  | {
      ok: false;
      error: string;
    };

/** Matches CUSTOMER_PREVIEW_MAX_SECONDS in previewEncoder.ts (legacy browser). */
export const SERVER_CUSTOMER_PREVIEW_MAX_SECONDS = 8;
