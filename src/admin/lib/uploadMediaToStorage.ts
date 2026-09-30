/**
 * Client: push IndexedDB media blobs to durable Supabase Storage.
 *
 * Phase 3.5:
 * - MASTER / PREVIEW (video): Admin cookie → signed auth → browser TUS direct to Storage
 * - THUMBNAIL (small): existing POST /api/admin/media/upload proxy
 *
 * Does NOT encode previews. Never sends service-role key to the browser.
 */

import type { AdminProduct, MediaAsset } from "@/admin/types";
import { loadMediaBlob } from "@/admin/services/mediaBlobStore";
import * as tus from "tus-js-client";

export type DurableMediaPrepareResult =
  | {
      ok: true;
      product: AdminProduct;
      mediaAsset: MediaAsset;
      uploaded: Array<"master" | "preview" | "thumbnail">;
      skippedMissing: Array<"master" | "preview" | "thumbnail">;
    }
  | { ok: false; error: string; status: number };

export type DurableMediaProgressEvent = {
  phase: "master" | "preview" | "thumbnail";
  /** 0–100 for the current phase */
  pct: number;
};

type UploadKind = "master" | "preview" | "thumbnail";

type SignedUploadAuthResponse = {
  ok?: boolean;
  error?: string;
  kind?: UploadKind;
  bucket?: string;
  path?: string;
  token?: string;
  signedUrl?: string;
  resumableEndpoint?: string;
  contentType?: string;
  durableUrl?: string;
};

function isBlobUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith("blob:") || url.startsWith("blob%3A");
}

function isDurableHttpsUrl(url: string | undefined | null): boolean {
  if (!url || isBlobUrl(url)) return false;
  return /^https:\/\//i.test(url.trim());
}

function isAlreadyDurableMasterRef(url: string | undefined | null): boolean {
  if (!url || isBlobUrl(url)) return false;
  if (isDurableHttpsUrl(url)) return true;
  return url.includes("media-masters/");
}

async function requestSignedUploadAuth(options: {
  productId: string;
  mediaAssetId: string;
  kind: "master" | "preview";
  contentType: string;
  fileName: string;
  fileSize: number;
}): Promise<
  | { ok: true; auth: Required<Pick<
      SignedUploadAuthResponse,
      | "token"
      | "resumableEndpoint"
      | "bucket"
      | "path"
      | "contentType"
      | "durableUrl"
      | "signedUrl"
    >> }
  | { ok: false; error: string; status: number }
> {
  let response: Response;
  try {
    response = await fetch("/api/admin/media/upload-url", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: options.productId,
        mediaAssetId: options.mediaAssetId,
        kind: options.kind,
        contentType: options.contentType,
        fileName: options.fileName,
        fileSize: options.fileSize,
      }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the media upload authorization API",
      status: 0,
    };
  }

  let body: SignedUploadAuthResponse = {};
  try {
    body = (await response.json()) as SignedUploadAuthResponse;
  } catch {
    body = {};
  }

  if (
    !response.ok ||
    !body.token ||
    !body.resumableEndpoint ||
    !body.bucket ||
    !body.path ||
    !body.durableUrl
  ) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : "Failed to authorize direct Storage upload";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  return {
    ok: true,
    auth: {
      token: body.token,
      resumableEndpoint: body.resumableEndpoint,
      bucket: body.bucket,
      path: body.path,
      contentType: body.contentType || options.contentType || "video/mp4",
      durableUrl: body.durableUrl,
      signedUrl: body.signedUrl || "",
    },
  };
}

/**
 * Browser → Supabase Storage via TUS (signed). Real byte progress + retry/resume.
 * Does not proxy bytes through Next.js.
 */
function uploadBlobViaTus(options: {
  blob: Blob;
  fileName: string;
  auth: {
    token: string;
    resumableEndpoint: string;
    bucket: string;
    path: string;
    contentType: string;
    durableUrl: string;
  };
  onProgress?: (pct: number) => void;
}): Promise<{ ok: true; url: string } | { ok: false; error: string; status: number }> {
  return new Promise((resolve) => {
    const upload = new tus.Upload(options.blob, {
      endpoint: options.auth.resumableEndpoint,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000],
      chunkSize: 6 * 1024 * 1024,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        "x-signature": options.auth.token,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: options.auth.bucket,
        objectName: options.auth.path,
        contentType: options.auth.contentType,
        cacheControl: "3600",
        filename: options.fileName,
      },
      onError(error) {
        resolve({
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Direct Storage upload failed",
          status: 500,
        });
      },
      onProgress(bytesUploaded, bytesTotal) {
        if (!bytesTotal) return;
        const pct = Math.max(
          0,
          Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100)),
        );
        options.onProgress?.(pct);
      },
      onSuccess() {
        options.onProgress?.(100);
        resolve({ ok: true, url: options.auth.durableUrl });
      },
    });

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      })
      .catch(() => {
        // Fingerprint lookup failed — start a fresh upload.
        upload.start();
      });
  });
}

async function uploadVideoDirect(options: {
  productId: string;
  mediaAssetId: string;
  kind: "master" | "preview";
  blob: Blob;
  fileName: string;
  onProgress?: (pct: number) => void;
}): Promise<{ ok: true; url: string } | { ok: false; error: string; status: number }> {
  const contentType =
    options.blob.type ||
    (options.kind === "preview" ? "video/mp4" : "video/mp4");

  const authorized = await requestSignedUploadAuth({
    productId: options.productId,
    mediaAssetId: options.mediaAssetId,
    kind: options.kind,
    contentType,
    fileName: options.fileName,
    fileSize: options.blob.size,
  });
  if (!authorized.ok) return authorized;

  return uploadBlobViaTus({
    blob: options.blob,
    fileName: options.fileName,
    auth: authorized.auth,
    onProgress: options.onProgress,
  });
}

/** Small files only — keeps Phase 3 thumbnail proxy path. */
async function postBlobToApiUpload(options: {
  productId: string;
  mediaAssetId: string;
  kind: "thumbnail";
  blob: Blob;
  fileName: string;
  onProgress?: (pct: number) => void;
}): Promise<{ ok: true; url: string } | { ok: false; error: string; status: number }> {
  options.onProgress?.(5);
  const form = new FormData();
  form.set("productId", options.productId);
  form.set("mediaAssetId", options.mediaAssetId);
  form.set("kind", options.kind);
  form.set("file", options.blob, options.fileName || "thumbnail.jpg");

  let response: Response;
  try {
    response = await fetch("/api/admin/media/upload", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the media upload API",
      status: 0,
    };
  }

  let body: { error?: string; url?: string; ok?: boolean } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok || !body.url) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : "Failed to upload media to durable storage";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  options.onProgress?.(100);
  return { ok: true, url: body.url };
}

/**
 * Upload available IndexedDB blobs for a product's media asset and return
 * CMS records with durable (non-blob) URLs ready for catalog publish.
 */
export async function prepareDurableMediaForPublish(
  product: AdminProduct,
  mediaAsset: MediaAsset,
  options?: {
    onProgress?: (event: DurableMediaProgressEvent) => void;
  },
): Promise<DurableMediaPrepareResult> {
  const productId = product.id.trim();
  const mediaAssetId = mediaAsset.id.trim();
  if (!productId || !mediaAssetId) {
    return {
      ok: false,
      error: "Product and media asset ids are required for media publish",
      status: 400,
    };
  }

  const nextAsset: MediaAsset = {
    ...mediaAsset,
    master: { ...mediaAsset.master },
    preview: { ...mediaAsset.preview },
    thumbnail: { ...mediaAsset.thumbnail },
  };
  const uploaded: UploadKind[] = [];
  const skippedMissing: UploadKind[] = [];
  const report = (phase: DurableMediaProgressEvent["phase"], pct: number) => {
    options?.onProgress?.({ phase, pct });
  };

  // --- Master (required) — direct/resumable TUS ---
  if (!isAlreadyDurableMasterRef(nextAsset.master.url)) {
    const stored = await loadMediaBlob(mediaAssetId, "original");
    if (!stored?.blob) {
      return {
        ok: false,
        error:
          "Master video is not available in this browser. Re-upload the master before publishing.",
        status: 409,
      };
    }
    report("master", 0);
    const result = await uploadVideoDirect({
      productId,
      mediaAssetId,
      kind: "master",
      blob: stored.blob,
      fileName: stored.fileName || nextAsset.master.fileName || "master.mp4",
      onProgress: (pct) => report("master", pct),
    });
    if (!result.ok) return result;
    nextAsset.master = { ...nextAsset.master, url: result.url };
    nextAsset.updatedAt = new Date().toISOString();
    uploaded.push("master");
  }

  // --- Preview (optional) — direct/resumable when blob exists ---
  if (!isDurableHttpsUrl(nextAsset.preview.url)) {
    const storedPreview = await loadMediaBlob(mediaAssetId, "preview");
    if (storedPreview?.blob) {
      report("preview", 0);
      const result = await uploadVideoDirect({
        productId,
        mediaAssetId,
        kind: "preview",
        blob: storedPreview.blob,
        fileName: storedPreview.fileName || "preview.mp4",
        onProgress: (pct) => report("preview", pct),
      });
      if (!result.ok) return result;
      nextAsset.preview = {
        ...nextAsset.preview,
        url: result.url,
        status:
          nextAsset.preview.status === "ready" ? "ready" : "uploaded",
      };
      nextAsset.updatedAt = new Date().toISOString();
      uploaded.push("preview");
    } else {
      skippedMissing.push("preview");
      if (isBlobUrl(nextAsset.preview.url)) {
        nextAsset.preview = { ...nextAsset.preview, url: "" };
      }
    }
  }

  // --- Thumbnail (optional) — small-file API proxy ---
  if (!isDurableHttpsUrl(nextAsset.thumbnail.url)) {
    const storedThumb = await loadMediaBlob(mediaAssetId, "thumb");
    if (storedThumb?.blob) {
      report("thumbnail", 0);
      const result = await postBlobToApiUpload({
        productId,
        mediaAssetId,
        kind: "thumbnail",
        blob: storedThumb.blob,
        fileName: storedThumb.fileName || "thumbnail.jpg",
        onProgress: (pct) => report("thumbnail", pct),
      });
      if (!result.ok) return result;
      nextAsset.thumbnail = {
        ...nextAsset.thumbnail,
        url: result.url,
      };
      nextAsset.updatedAt = new Date().toISOString();
      uploaded.push("thumbnail");
    } else {
      skippedMissing.push("thumbnail");
      if (isBlobUrl(nextAsset.thumbnail.url)) {
        nextAsset.thumbnail = { ...nextAsset.thumbnail, url: "" };
      }
    }
  }

  const previewUrl = isDurableHttpsUrl(nextAsset.preview.url)
    ? nextAsset.preview.url
    : undefined;
  const durableThumb =
    (isDurableHttpsUrl(nextAsset.thumbnail.url)
      ? nextAsset.thumbnail.url
      : "") ||
    (isDurableHttpsUrl(product.media.thumbnail)
      ? product.media.thumbnail
      : "") ||
    "";

  const nextProduct: AdminProduct = {
    ...product,
    mediaAssetId,
    media: {
      ...product.media,
      thumbnail: durableThumb,
      downloadFileName:
        product.media.downloadFileName || nextAsset.master.fileName,
      downloadFileSize:
        product.media.downloadFileSize || nextAsset.master.sizeLabel,
    },
    updatedAt: new Date().toISOString(),
  };

  if (previewUrl) {
    nextProduct.media.previewVideo = previewUrl;
  } else {
    delete nextProduct.media.previewVideo;
  }

  return {
    ok: true,
    product: nextProduct,
    mediaAsset: nextAsset,
    uploaded,
    skippedMissing,
  };
}
