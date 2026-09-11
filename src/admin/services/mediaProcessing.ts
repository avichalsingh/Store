import type { MediaAsset } from "@/admin/types";

export interface MediaProcessingService {
  createJob(assetId: string): Promise<string>;
}

export class MockMediaProcessingService implements MediaProcessingService {
  async createJob(assetId: string): Promise<string> {
    return `job-${assetId}-${Date.now()}`;
  }
}

export const mediaProcessingService: MediaProcessingService =
  new MockMediaProcessingService();

type Timer = ReturnType<typeof setTimeout>;

/** Hard ceiling so a hung encode cannot leave the asset in PROCESSING forever. */
const JOB_TIMEOUT_MS = 90_000;

/**
 * Starts real preview encode promptly.
 * Progress UI comes from the encoder; this helper must never mark preview
 * ready / watermark baked, and must never overwrite a failed encode as ready.
 *
 * Terminal outcomes: encode callback sets READY/FAILED via materialize, or
 * this helper marks FAILED on encode rejection / overall timeout.
 * Cancel only suppresses updates when a newer job has taken over.
 */
export function simulateProcessing(
  asset: MediaAsset,
  onUpdate: (partial: Partial<MediaAsset>) => void,
  onEncode?: (assetSnapshot: MediaAsset) => void | Promise<void>,
): () => void {
  const timers: Timer[] = [];
  let cancelled = false;
  let latest: MediaAsset = asset;
  let jobTimer: Timer | null = null;

  const schedule = (ms: number, fn: () => void) => {
    const id = setTimeout(() => {
      if (!cancelled) fn();
    }, ms);
    timers.push(id);
  };

  const stamp = () => new Date().toISOString();

  const apply = (partial: Partial<MediaAsset>) => {
    if (cancelled) return;
    latest = {
      ...latest,
      ...partial,
      master: partial.master ? { ...latest.master, ...partial.master } : latest.master,
      preview: partial.preview ? { ...latest.preview, ...partial.preview } : latest.preview,
      thumbnail: partial.thumbnail
        ? { ...latest.thumbnail, ...partial.thumbnail }
        : latest.thumbnail,
      processingSteps: partial.processingSteps
        ? { ...latest.processingSteps, ...partial.processingSteps }
        : latest.processingSteps,
    };
    onUpdate(partial);
  };

  const fail = (message: string) => {
    if (cancelled) return;
    apply({
      processingStatus: "failed",
      processingError: message,
      previewPlayback: "none",
      preview: {
        ...latest.preview,
        status: "failed",
        url: "",
        watermarkApplied: false,
      },
      processingSteps: {
        ...latest.processingSteps,
        previewGenerating: false,
        previewReady: false,
        watermarkApplying: false,
        watermarkReady: false,
        thumbnailExtracting: false,
      },
      updatedAt: stamp(),
    });
  };

  schedule(120, () => {
    apply({
      processingStatus: "processing",
      processingSteps: {
        ...latest.processingSteps,
        uploadComplete: true,
        previewGenerating: true,
        previewReady: false,
        watermarkApplying: false,
        watermarkReady: false,
      },
      preview: {
        ...latest.preview,
        status: "processing",
        watermarkApplied: false,
        url: "",
      },
      previewPlayback: "none",
      updatedAt: stamp(),
    });

    jobTimer = setTimeout(() => {
      fail(
        "Preview generation timed out. Retry preview generation — the master image was not modified.",
      );
    }, JOB_TIMEOUT_MS);
    timers.push(jobTimer);

    void Promise.resolve()
      .then(() => onEncode?.(latest))
      .then(() => {
        if (jobTimer) {
          clearTimeout(jobTimer);
          jobTimer = null;
        }
        // Terminal READY/FAILED is applied by materialize via onUpdate.
      })
      .catch((err) => {
        if (jobTimer) {
          clearTimeout(jobTimer);
          jobTimer = null;
        }
        fail(err instanceof Error ? err.message : "Preview encode failed");
      });
  });

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    jobTimer = null;
  };
}
