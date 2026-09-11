import {
  EMPTY_PROCESSING_STEPS,
  formatSizeBytes,
} from "@/admin/lib/mediaAdapter";
import { resolveAdminMasterDisplayUrl } from "@/admin/lib/mediaPreview";
import type { AdminProduct, MediaAsset } from "@/admin/types";
import type { AiImageFile } from "@/catalog/productPayloads";

/** Display URL for ADMIN Media Library / pickers — clean Master only (no watermark). */
export function resolveMediaAssetDisplayUrl(
  asset: MediaAsset | undefined | null,
): string {
  if (!asset) return "";
  return resolveAdminMasterDisplayUrl(asset);
}

/** Customer / storefront visual — watermarked Preview when available. */
export function resolvePublicPreviewUrl(
  asset: MediaAsset | undefined | null,
): string {
  if (!asset) return "";
  if (
    (asset.previewPlayback === "generated" || asset.preview.watermarkApplied) &&
    asset.preview.url
  ) {
    return asset.preview.url;
  }
  return "";
}

/**
 * Storefront/public thumbnail for any product.
 * AI_IMAGE → watermarked preview only (never clean master).
 * Other types → existing admin-safe product thumb (video poster, etc.).
 */
export function resolveStorefrontProductImageUrl(
  product: AdminProduct | undefined | null,
  mediaAssets: MediaAsset[] = [],
): string {
  if (!product) return "";
  if (product.productType === "AI_IMAGE") {
    const asset = product.mediaAssetId
      ? mediaAssets.find((a) => a.id === product.mediaAssetId)
      : undefined;
    return resolvePublicPreviewUrl(asset);
  }
  // Lazy import avoided — callers that need video posters pass through
  // resolveProductThumbnail separately when needed.
  return "";
}

/** Resolve an AI image entry against Media Library for display / storefront. */
export function resolveAiImageFile(
  image: AiImageFile,
  mediaAssets: MediaAsset[] = [],
): AiImageFile {
  if (!image.mediaAssetId) return image;
  const asset = mediaAssets.find((a) => a.id === image.mediaAssetId);
  if (!asset) return image;
  const publicPreview = resolvePublicPreviewUrl(asset);
  const adminMaster = resolveMediaAssetDisplayUrl(asset);
  return {
    ...image,
    // Master / downloadable original (never use as public preview)
    url: asset.master.url || adminMaster || image.url || "",
    // Public preview only — do not fall back to clean master
    previewUrl: publicPreview || image.previewUrl || "",
    fileName: asset.originalFileName || asset.name || image.fileName || "",
    sizeLabel: asset.master.sizeLabel || image.sizeLabel,
  };
}

export function resolveAiImageFiles(
  images: AiImageFile[] | undefined,
  mediaAssets: MediaAsset[] = [],
): AiImageFile[] {
  return (images ?? []).map((img) => resolveAiImageFile(img, mediaAssets));
}

export function aiImageFileFromAsset(
  asset: MediaAsset,
  opts?: { isCover?: boolean; id?: string },
): AiImageFile {
  return {
    id: opts?.id ?? `img-${asset.id}`,
    mediaAssetId: asset.id,
    isCover: Boolean(opts?.isCover),
  };
}

/** Stable id for migrating a static URL into a shared Media Library image asset. */
export function mediaAssetIdForImageUrl(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }
  const abs = Math.abs(hash).toString(36);
  return `media-img-${abs}`;
}

function fileNameFromUrl(url: string): string {
  try {
    const path = url.split("?")[0] ?? url;
    const base = path.split("/").pop() || "image.jpg";
    return decodeURIComponent(base);
  } catch {
    return "image.jpg";
  }
}

/** Build a ready image MediaAsset from a public/static URL (no local blob). */
export function createImageAssetFromUrl(
  url: string,
  opts?: { id?: string; name?: string },
): MediaAsset {
  const stamp = new Date().toISOString();
  const fileName = fileNameFromUrl(url);
  const id = opts?.id ?? mediaAssetIdForImageUrl(url);
  return {
    id,
    name: opts?.name ?? (fileName.replace(/\.[^.]+$/, "") || "Image"),
    originalFileName: fileName,
    type: "image",
    master: {
      url,
      fileName,
      sizeBytes: 0,
      sizeLabel: "",
      resolution: "",
      duration: "",
      durationSeconds: 0,
      access: "protected",
    },
    preview: {
      url: "",
      status: "uploaded",
      resolution: "",
      quality: "standard",
      watermarkApplied: false,
      access: "public",
    },
    thumbnail: {
      url,
      source: "custom",
      timestamp: 0,
      timestampLabel: "00:00.0",
    },
    processingStatus: "uploaded",
    processingSteps: {
      ...EMPTY_PROCESSING_STEPS,
      uploadComplete: true,
      thumbnailReady: true,
    },
    watermarkMode: "global",
    previewQuality: "standard",
    usedByProductIds: [],
    hasLocalBlob: false,
    previewPlayback: "none",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Migrate legacy AI image URL entries into Media Library references.
 * Reuses one MediaAsset per unique URL. Does not overwrite existing mediaAssetId links.
 */
/**
 * Migrate legacy multi-image AI products → single mediaAssetId (Master Image).
 * Creates shared Media Library assets for URL-based entries.
 * Clears aiImageData.images[] (product assets live on mediaAssetId now).
 * Pack SKUs keep collectionId metadata; gallery comes from collection members.
 *
 * Also heals AI_IMAGE products that were incorrectly linked to video
 * seed assets (empty .mp4 masters) — those caused Preview to hang forever in
 * the video encode pipeline.
 */
export function migrateAiImageProductsToMediaLibrary(
  products: AdminProduct[],
  mediaAssets: MediaAsset[],
): { products: AdminProduct[]; mediaAssets: MediaAsset[] } {
  const byId = new Map(mediaAssets.map((a) => [a.id, a]));
  const urlToId = new Map<string, string>();

  for (const asset of mediaAssets) {
    if (asset.type !== "image") continue;
    for (const u of [asset.master.url, asset.thumbnail.url, asset.preview.url]) {
      if (u && !urlToId.has(u)) urlToId.set(u, asset.id);
    }
  }

  /**
   * Repair image assets whose master.url was wiped (e.g. rehydrate replaced a
   * durable path with "" when only a preview blob existed in IndexedDB).
   */
  const healEmptyImageMaster = (
    assetId: string,
    sourceUrl: string,
    nameHint?: string,
  ) => {
    const url = sourceUrl.trim();
    if (!url || url.startsWith("blob:")) return;
    const existing = byId.get(assetId);
    if (!existing || existing.type !== "image") return;
    if (existing.master.url && !existing.master.url.startsWith("blob:")) return;
    // Do not heal master from a known watermarked preview URL.
    if (
      url === existing.preview.url &&
      (existing.preview.watermarkApplied ||
        existing.previewPlayback === "generated")
    ) {
      return;
    }
    const healed = createImageAssetFromUrl(url, {
      id: assetId,
      name: nameHint || existing.name,
    });
    byId.set(assetId, {
      ...existing,
      ...healed,
      // Preserve generated preview / processing state when present
      preview: existing.preview.url
        ? existing.preview
        : healed.preview,
      previewPlayback: existing.previewPlayback ?? healed.previewPlayback,
      processingStatus: existing.processingStatus,
      processingSteps: existing.processingSteps,
      processingError: existing.processingError,
      hasLocalBlob: existing.hasLocalBlob,
      usedByProductIds: existing.usedByProductIds,
      watermarkMode: existing.watermarkMode,
      watermarkConfig: existing.watermarkConfig,
      previewQuality: existing.previewQuality,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    });
    urlToId.set(url, assetId);
  };

  const ensureAssetForUrl = (url: string, nameHint?: string) => {
    let assetId = urlToId.get(url);
    if (!assetId) {
      assetId = mediaAssetIdForImageUrl(url);
      if (!byId.has(assetId)) {
        const created = createImageAssetFromUrl(url, {
          id: assetId,
          name: nameHint?.replace(/\.[^.]+$/, "") || undefined,
        });
        byId.set(assetId, created);
      }
      urlToId.set(url, assetId);
    } else if (!byId.has(assetId)) {
      byId.set(assetId, createImageAssetFromUrl(url, { id: assetId }));
    }
    return assetId;
  };

  /**
   * Convert a wrongly-typed video seed asset into a image in place
   * (same id) so product links stay stable.
   */
  const healVideoAssetAsImage = (
    assetId: string,
    url: string,
    nameHint?: string,
  ) => {
    const healed = createImageAssetFromUrl(url, {
      id: assetId,
      name: nameHint,
    });
    byId.set(assetId, healed);
    urlToId.set(url, assetId);
    return assetId;
  };

  let productsChanged = false;
  const nextProducts = products.map((product) => {
    if (product.productType !== "AI_IMAGE") return product;

    const images = product.aiImageData?.images ?? [];
    let mediaAssetId = product.mediaAssetId;

    // Prefer existing mediaAssetId if it points at a real image asset
    if (mediaAssetId) {
      const existing = byId.get(mediaAssetId);
      if (!existing) {
        mediaAssetId = undefined;
      } else if (existing.type !== "image") {
        // Linked to a video seed stub — heal using product still URL.
        const sourceUrl = (
          product.media.thumbnail ||
          images.find((i) => i.isCover)?.previewUrl ||
          images.find((i) => i.isCover)?.url ||
          images[0]?.previewUrl ||
          images[0]?.url ||
          existing.thumbnail.url ||
          ""
        ).trim();
        if (sourceUrl && !sourceUrl.startsWith("blob:")) {
          mediaAssetId = healVideoAssetAsImage(
            existing.id,
            sourceUrl,
            product.name,
          );
        } else {
          mediaAssetId = undefined;
        }
      } else if (!existing.master.url || existing.master.url.startsWith("blob:")) {
        const sourceUrl = (
          (existing.thumbnail.url &&
          existing.thumbnail.url !== existing.preview.url
            ? existing.thumbnail.url
            : "") ||
          images.find((i) => i.isCover)?.url ||
          images[0]?.url ||
          (product.media.thumbnail &&
          product.media.thumbnail !== existing.preview.url
            ? product.media.thumbnail
            : "") ||
          ""
        ).trim();
        if (sourceUrl) {
          healEmptyImageMaster(existing.id, sourceUrl, product.name);
        }
      }
    }

    if (!mediaAssetId && images.length) {
      const cover = images.find((i) => i.isCover) ?? images[0];
      if (cover?.mediaAssetId && byId.get(cover.mediaAssetId)?.type === "image") {
        mediaAssetId = cover.mediaAssetId;
      } else {
        const sourceUrl = (cover?.previewUrl || cover?.url || "").trim();
        if (sourceUrl) {
          mediaAssetId = ensureAssetForUrl(sourceUrl, cover?.fileName);
        }
      }
    }

    if (!mediaAssetId) {
      const thumb = (product.media.thumbnail || "").trim();
      if (thumb && !thumb.startsWith("blob:")) {
        mediaAssetId = ensureAssetForUrl(thumb, product.name);
      }
    }

    const asset = mediaAssetId ? byId.get(mediaAssetId) : undefined;
    // Admin product thumb = clean master only (never watermarked preview).
    const thumb =
      resolveMediaAssetDisplayUrl(asset) || product.media.thumbnail;

    const imagesCleared = images.length > 0;
    const assetChanged = mediaAssetId !== product.mediaAssetId;
    if (!imagesCleared && !assetChanged && thumb === product.media.thumbnail) {
      return product;
    }

    productsChanged = true;
    return {
      ...product,
      mediaAssetId,
      media: {
        ...product.media,
        thumbnail: thumb || product.media.thumbnail,
      },
      resolution:
        product.resolution ||
        product.aiImageData?.resolution ||
        asset?.master.resolution ||
        "",
      format: product.format || product.aiImageData?.format || "PNG",
      aiImageData: {
        ...(product.aiImageData ?? { images: [] }),
        images: [],
        resolution:
          product.aiImageData?.resolution ||
          asset?.master.resolution ||
          product.resolution,
        format: product.aiImageData?.format || product.format || "PNG",
      },
    };
  });

  const nextAssets = Array.from(byId.values());
  const byPrev = new Map(mediaAssets.map((a) => [a.id, a]));
  const assetsChanged =
    nextAssets.length !== mediaAssets.length ||
    nextAssets.some((a) => {
      const prev = byPrev.get(a.id);
      return !prev || prev.type !== a.type || prev.master.url !== a.master.url;
    });

  if (!productsChanged && !assetsChanged) {
    return { products, mediaAssets };
  }
  return { products: nextProducts, mediaAssets: nextAssets };
}

export function buildUploadedImageAssetFromFile(opts: {
  id: string;
  file: File;
  objectUrl: string;
  width?: number;
  height?: number;
  previewQuality?: MediaAsset["previewQuality"];
}): MediaAsset {
  const { id, file, objectUrl, width, height } = opts;
  const stamp = new Date().toISOString();
  const baseName = file.name.replace(/\.[^.]+$/, "") || "Untitled image";
  const resolution =
    width && height ? `${width}x${height}` : "";

  return {
    id,
    name: baseName,
    originalFileName: file.name,
    type: "image",
    master: {
      url: objectUrl,
      fileName: file.name,
      sizeBytes: file.size,
      sizeLabel: formatSizeBytes(file.size),
      resolution,
      duration: "",
      durationSeconds: 0,
      access: "protected",
    },
    preview: {
      url: "",
      status: "uploaded",
      resolution: "",
      quality: opts.previewQuality ?? "optimized",
      watermarkApplied: false,
      access: "public",
    },
    thumbnail: {
      url: objectUrl,
      source: "custom",
      timestamp: 0,
      timestampLabel: "00:00.0",
    },
    processingStatus: "uploaded",
    processingSteps: {
      ...EMPTY_PROCESSING_STEPS,
      uploadComplete: true,
    },
    watermarkMode: "global",
    previewQuality: opts.previewQuality ?? "optimized",
    usedByProductIds: [],
    hasLocalBlob: true,
    previewPlayback: "none",
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/** @deprecated Use buildUploadedImageAssetFromFile + processing job. */
export function buildReadyImageAssetFromFile(opts: {
  id: string;
  file: File;
  objectUrl: string;
  width?: number;
  height?: number;
}): MediaAsset {
  return buildUploadedImageAssetFromFile(opts);
}
