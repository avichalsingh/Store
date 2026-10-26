/**
 * Server-only Supabase Storage helpers for durable Admin media.
 * Never import from client components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_MASTERS_BUCKET = "media-masters";
export const MEDIA_PREVIEWS_BUCKET = "media-previews";

/** Product requirement: durable video masters up to 500 MB. */
export const MEDIA_FILE_SIZE_LIMIT_BYTES = 524_288_000;

export type MediaStorageKind = "master" | "preview" | "thumbnail";

const BUCKET_FOR_KIND: Record<MediaStorageKind, string> = {
  master: MEDIA_MASTERS_BUCKET,
  preview: MEDIA_PREVIEWS_BUCKET,
  thumbnail: MEDIA_PREVIEWS_BUCKET,
};

/** Master is downloadable/admin; previews+thumbs are storefront-facing. */
const PUBLIC_BUCKETS = new Set([MEDIA_PREVIEWS_BUCKET]);

const GLOBAL_LIMIT_DASHBOARD_HINT =
  "Raise the Supabase project global file size limit to at least 500 MB: Dashboard → Project Settings → Storage → Global file size limit (or Storage settings). Bucket limits cannot exceed the project global limit.";

export function extensionForUpload(
  kind: MediaStorageKind,
  fileName: string,
  mimeType: string,
): string {
  const fromName = fileName.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) {
    if (kind === "thumbnail") {
      if (["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
        return fromName === "jpeg" ? "jpg" : fromName;
      }
    } else if (["mp4", "webm", "mov", "m4v"].includes(fromName)) {
      return fromName;
    }
  }
  if (kind === "thumbnail") {
    if (mimeType.includes("png")) return "png";
    if (mimeType.includes("webp")) return "webp";
    return "jpg";
  }
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("quicktime")) return "mov";
  return "mp4";
}

export function buildObjectPath(
  productId: string,
  mediaAssetId: string,
  kind: MediaStorageKind,
  ext: string,
): string {
  const safeProduct = productId.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  const safeAsset = mediaAssetId.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeProduct}/${safeAsset}/${kind}.${ext}`;
}

export async function ensureMediaBuckets(
  supabase: SupabaseClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const bucket of [MEDIA_MASTERS_BUCKET, MEDIA_PREVIEWS_BUCKET]) {
    const isPublic = PUBLIC_BUCKETS.has(bucket);
    const { data: existing, error: listError } = await supabase.storage.getBucket(
      bucket,
    );
    if (listError && !/not found|Bucket not found/i.test(listError.message)) {
      // Fall through to create — getBucket may 404 when missing.
    }
    if (existing) {
      const needsPrivacy = Boolean(existing.public) !== isPublic;
      const currentLimit =
        typeof existing.file_size_limit === "number"
          ? existing.file_size_limit
          : null;
      const needsSize =
        currentLimit === null || currentLimit < MEDIA_FILE_SIZE_LIMIT_BYTES;

      if (needsPrivacy || needsSize) {
        const { error: updateError } = await supabase.storage.updateBucket(
          bucket,
          {
            public: isPublic,
            fileSizeLimit: MEDIA_FILE_SIZE_LIMIT_BYTES,
          },
        );
        if (updateError) {
          // Project global Storage cap often blocks a 500 MB bucket limit.
          // Keep privacy correct; size is enforced later against the effective limit.
          if (needsPrivacy) {
            const { error: privacyError } = await supabase.storage.updateBucket(
              bucket,
              { public: isPublic },
            );
            if (privacyError) {
              return {
                ok: false,
                error: `Failed to update Storage bucket "${bucket}": ${privacyError.message}`,
              };
            }
          }
          // Do not fail ensure for size alone — upload-url returns 413 with
          // GLOBAL_LIMIT_DASHBOARD_HINT when a specific file exceeds the cap.
          if (needsSize && /maximum allowed size|file size|limit/i.test(updateError.message)) {
            // Leave existing limit in place until the project global limit is raised.
          } else if (needsSize) {
            return {
              ok: false,
              error: `Failed to update Storage bucket "${bucket}" size limit: ${updateError.message}. ${GLOBAL_LIMIT_DASHBOARD_HINT}`,
            };
          }
        }
      }
      continue;
    }
    const { error: createError } = await supabase.storage.createBucket(bucket, {
      public: isPublic,
      fileSizeLimit: MEDIA_FILE_SIZE_LIMIT_BYTES,
    });
    if (
      createError &&
      !/already exists|duplicate/i.test(createError.message)
    ) {
      return {
        ok: false,
        error: `Failed to create Storage bucket "${bucket}": ${createError.message}. ${GLOBAL_LIMIT_DASHBOARD_HINT}`,
      };
    }
  }
  return { ok: true };
}

/**
 * Effective per-bucket upload ceiling (bytes), or null if unset (inherits project default).
 */
export async function getMediaBucketFileSizeLimit(
  supabase: SupabaseClient,
  kind: MediaStorageKind,
): Promise<number | null> {
  const bucket = BUCKET_FOR_KIND[kind];
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (error || !data) return null;
  return typeof data.file_size_limit === "number" ? data.file_size_limit : null;
}

export type UploadedMediaObject = {
  kind: MediaStorageKind;
  bucket: string;
  path: string;
  /** HTTPS public URL for public buckets; storage-ref path for private masters. */
  url: string;
};

export async function uploadMediaObject(
  supabase: SupabaseClient,
  options: {
    productId: string;
    mediaAssetId: string;
    kind: MediaStorageKind;
    bytes: ArrayBuffer | Buffer | Blob;
    fileName: string;
    contentType: string;
  },
): Promise<{ ok: true; object: UploadedMediaObject } | { ok: false; error: string }> {
  const bucket = BUCKET_FOR_KIND[options.kind];
  const ext = extensionForUpload(
    options.kind,
    options.fileName,
    options.contentType,
  );
  const path = buildObjectPath(
    options.productId,
    options.mediaAssetId,
    options.kind,
    ext,
  );

  const { error } = await supabase.storage.from(bucket).upload(path, options.bytes, {
    contentType: options.contentType || undefined,
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    return {
      ok: false,
      error: `Storage upload failed (${options.kind}): ${error.message}`,
    };
  }

  if (PUBLIC_BUCKETS.has(bucket)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return {
      ok: true,
      object: {
        kind: options.kind,
        bucket,
        path,
        url: data.publicUrl,
      },
    };
  }

  // Private master: store a parseable storage ref for media_assets mapper
  // (never a blob:). Admin playback continues via IndexedDB when present.
  return {
    ok: true,
    object: {
      kind: options.kind,
      bucket,
      path,
      url: `${bucket}/${path}`,
    },
  };
}

export function isAllowedMediaContentType(
  kind: MediaStorageKind,
  contentType: string,
): boolean {
  const t = contentType.toLowerCase().split(";")[0]?.trim() || "";
  if (kind === "thumbnail") {
    return (
      t.startsWith("image/jpeg") ||
      t.startsWith("image/jpg") ||
      t.startsWith("image/png") ||
      t.startsWith("image/webp") ||
      t.startsWith("image/gif") ||
      t === "application/octet-stream"
    );
  }
  return (
    t.startsWith("video/mp4") ||
    t.startsWith("video/webm") ||
    t.startsWith("video/quicktime") ||
    t.startsWith("video/x-m4v") ||
    t === "application/octet-stream" ||
    t === ""
  );
}

export function isDurableHttpsUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  if (url.startsWith("blob:") || url.startsWith("blob%3A")) return false;
  return /^https:\/\//i.test(url.trim());
}

export type SignedMediaUploadAuth = {
  kind: MediaStorageKind;
  bucket: string;
  path: string;
  token: string;
  /** Non-TUS signed PUT URL (fallback). */
  signedUrl: string;
  /** TUS endpoint for signed resumable uploads. */
  resumableEndpoint: string;
  contentType: string;
  /** CMS durable URL/ref after a successful direct upload. */
  durableUrl: string;
};

/**
 * Authorize a browser-direct / resumable upload. Path is always server-built.
 * Returns a short-lived token — never the service-role key.
 */
export async function createSignedMediaUploadAuthorization(
  supabase: SupabaseClient,
  options: {
    productId: string;
    mediaAssetId: string;
    kind: MediaStorageKind;
    fileName: string;
    contentType: string;
  },
): Promise<
  { ok: true; auth: SignedMediaUploadAuth } | { ok: false; error: string }
> {
  const bucket = BUCKET_FOR_KIND[options.kind];
  const ext = extensionForUpload(
    options.kind,
    options.fileName,
    options.contentType,
  );
  const path = buildObjectPath(
    options.productId,
    options.mediaAssetId,
    options.kind,
    ext,
  );

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data?.token) {
    return {
      ok: false,
      error: `Failed to authorize Storage upload: ${error?.message ?? "no token"}`,
    };
  }

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
    /\/$/,
    "",
  );
  if (!supabaseUrl) {
    return { ok: false, error: "NEXT_PUBLIC_SUPABASE_URL is not configured" };
  }

  const durableUrl = PUBLIC_BUCKETS.has(bucket)
    ? supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
    : `${bucket}/${path}`;

  return {
    ok: true,
    auth: {
      kind: options.kind,
      bucket,
      path,
      token: data.token,
      signedUrl: data.signedUrl,
      resumableEndpoint: buildResumableSignedEndpoint(supabaseUrl),
      contentType: options.contentType || "application/octet-stream",
      durableUrl,
    },
  };
}

/** Prefer dedicated storage hostname for TUS when using *.supabase.co. */
export function buildResumableSignedEndpoint(supabaseUrl: string): string {
  try {
    const url = new URL(supabaseUrl);
    if (
      url.hostname.endsWith(".supabase.co") &&
      !url.hostname.includes(".storage.")
    ) {
      const ref = url.hostname.replace(/\.supabase\.co$/i, "");
      return `https://${ref}.storage.supabase.co/storage/v1/upload/resumable/sign`;
    }
    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable/sign`;
  } catch {
    return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/upload/resumable/sign`;
  }
}
