/**
 * Server ↔ worker contract for Phase 5A customer preview processing.
 * Never import WORKER_SHARED_SECRET or service-role into client code.
 */

export type MediaProcessRequestBody = {
  mediaAssetId: string;
  /** When media_assets row lacks path, server builds path with productId. */
  productId?: string;
  /** Re-run even if already ready. */
  force?: boolean;
};

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

/** Matches CUSTOMER_PREVIEW_MAX_SECONDS in previewEncoder.ts (legacy browser). */
export const SERVER_CUSTOMER_PREVIEW_MAX_SECONDS = 8;
