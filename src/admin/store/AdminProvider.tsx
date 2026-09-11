"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSeedState, type AdminCmsState } from "@/admin/data/seed";
import {
  defaultImagePdpGlobalSettings,
  type ImagePdpGlobalSettings,
} from "@/catalog/imagePdpTypes";
import { marketplaceSeedProducts } from "@/admin/data/marketplaceSeed";
import {
  normalizePendingChanges,
  normalizePriceHistory,
  normalizeTool,
  normalizeTools,
  normalizeToolsSettings,
} from "@/admin/lib/normalizeTool";
import type {
  AiTool,
  ToolPendingChange,
  ToolsSettings,
} from "@/catalog/tools/types";
import { toolsSeedProducts } from "@/admin/data/toolsSeed";
import { uid } from "@/admin/lib/format";
import {
  normalizeCharacter,
  recomputeCharacterCounts,
} from "@/admin/lib/characterHelpers";
import { normalizeCollection } from "@/admin/lib/collectionCover";
import {
  assetToProductMedia,
  EMPTY_PROCESSING_STEPS,
  formatDuration,
  formatSizeBytes,
  formatTimestamp,
} from "@/admin/lib/mediaAdapter";
import { normalizeAdminProducts } from "@/admin/lib/normalizeProduct";
import {
  aiImageFileFromAsset,
  buildUploadedImageAssetFromFile,
  migrateAiImageProductsToMediaLibrary,
  resolveMediaAssetDisplayUrl,
} from "@/admin/lib/resolveAiImageMedia";
import {
  isSeedPlaceholderVideo,
  recomputeMediaUsage,
  rehydrateMediaObjectUrls,
  sanitizeMediaAssetsForStorage,
} from "@/admin/lib/mediaPreview";
import {
  deleteMediaBlobs,
  persistOriginalUpload,
  saveMediaBlob,
} from "@/admin/services/mediaBlobStore";
import { materializePreviewAndThumbnail } from "@/admin/services/mediaDerivatives";
import { simulateProcessing } from "@/admin/services/mediaProcessing";
import { CMS_STORAGE_KEY } from "@/catalog/cmsEvents";
import type {
  AdminCampaign,
  AdminCharacter,
  AdminCollection,
  AdminNotification,
  AdminOffer,
  AdminProduct,
  Announcement,
  GlobalMediaSettings,
  HomepageHeroConfig,
  HomepageSection,
  MediaAsset,
} from "@/admin/types";

const STORAGE_KEY = CMS_STORAGE_KEY;
const LEGACY_STORAGE_KEYS = [
  "rhythm-admin-cms-v7",
  "rhythm-admin-cms-v6",
  "rhythm-admin-cms-v5",
  "rhythm-admin-cms-v4",
  "rhythm-admin-cms-v3",
  "rhythm-admin-cms-v2",
  "rhythm-admin-cms-v1",
];

export type ToastTone = "success" | "error" | "info";

export type AdminToast = {
  id: string;
  message: string;
  tone: ToastTone;
};

type AdminContextValue = AdminCmsState & {
  hydrated: boolean;
  toasts: AdminToast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
  upsertProduct: (product: AdminProduct, toast?: string) => void;
  duplicateProduct: (id: string) => AdminProduct | null;
  archiveProduct: (id: string) => void;
  deleteProduct: (id: string) => void;
  upsertCharacter: (character: AdminCharacter, toast?: string) => void;
  duplicateCharacter: (id: string) => AdminCharacter | null;
  deleteCharacter: (id: string) => void;
  assignProductsToCharacter: (characterId: string, productIds: string[]) => void;
  removeProductFromCharacter: (productId: string, characterId: string) => void;
  upsertCollection: (collection: AdminCollection, toast?: string) => void;
  duplicateCollection: (id: string) => AdminCollection | null;
  deleteCollection: (id: string) => void;
  upsertCampaign: (campaign: AdminCampaign, toast?: string) => void;
  deleteCampaign: (id: string) => void;
  upsertOffer: (offer: AdminOffer, toast?: string) => void;
  deleteOffer: (id: string) => void;
  upsertAnnouncement: (announcement: Announcement, toast?: string) => void;
  deleteAnnouncement: (id: string) => void;
  setHomepageSections: (sections: HomepageSection[], toast?: string | null) => void;
  setHomepageHero: (hero: HomepageHeroConfig, toast?: string | null) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  resetStore: () => void;
  upsertMediaAsset: (asset: MediaAsset, toast?: string) => void;
  updateMediaAsset: (id: string, partial: Partial<MediaAsset>, toast?: string | null) => void;
  deleteMediaAsset: (id: string) => void;
  setMediaSettings: (settings: GlobalMediaSettings, toast?: string) => void;
  setImagePdpSettings: (settings: ImagePdpGlobalSettings, toast?: string) => void;
  uploadMasterVideos: (files: File[]) => Promise<string[]>;
  /** Upload still images into the Media Library (ready immediately). */
  uploadMasterImages: (files: File[]) => Promise<string[]>;
  /** Replace the master file on an existing asset and regenerate the customer preview. */
  replaceMasterVideo: (assetId: string, file: File) => Promise<void>;
  /**
   * Regenerate only the customer Preview Image/Video for an existing asset.
   * Does not re-upload or modify the Master file.
   */
  regenerateMediaPreview: (assetId: string) => void;
  attachMediaToProduct: (productId: string, assetId: string) => void;
  detachMediaFromProduct: (productId: string) => void;
  /** Attach a Media Library image to an AI Image product's selected assets. */
  attachImageAssetToAiProduct: (productId: string, assetId: string) => void;
  /** Remove a Media Library image from an AI Image product's selected assets. */
  detachImageAssetFromAiProduct: (productId: string, assetId: string) => void;
  upsertAiTool: (tool: AiTool, toast?: string) => void;
  deleteAiTool: (id: string) => void;
  setToolsSettings: (settings: ToolsSettings, toast?: string | null) => void;
  resolveToolPendingChange: (
    changeId: string,
    action: "approve" | "reject" | "edit",
    edited?: Partial<AiTool>,
  ) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

/** Probe real duration / dimensions from an uploaded video File. */
function probeVideoFile(
  file: File,
): Promise<{ durationSeconds: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    };
    video.onloadedmetadata = () => {
      const durationSeconds = Number.isFinite(video.duration)
        ? video.duration
        : 0;
      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;
      cleanup();
      resolve({ durationSeconds, width, height });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}

/** Probe still-image dimensions from an uploaded File. */
function probeImageFile(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    };
    img.onload = () => {
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      cleanup();
      resolve({ width, height });
    };
    img.onerror = () => {
      cleanup();
      reject(new Error("Could not read image metadata"));
    };
    img.src = url;
  });
}

function needsReseed(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== "object") return true;
  const state = parsed as Partial<AdminCmsState>;
  if (!Array.isArray(state.mediaAssets) || state.mediaAssets.length === 0) return true;
  if (!state.mediaSettings) return true;
  if (!Array.isArray(state.collections) || state.collections.length === 0) return true;
  if (state.collections.some((c) => !c || typeof c !== "object" || !("coverMode" in c))) {
    return true;
  }
  if (!Array.isArray(state.characters) || state.characters.length === 0) return true;
  if (!Array.isArray(state.aiTools)) return true;
  return false;
}

function ensureMarketplaceSeedProducts(
  products: AdminProduct[],
): AdminProduct[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  let changed = false;
  for (const seed of marketplaceSeedProducts) {
    const existing = byId.get(seed.id);
    if (!existing) {
      byId.set(seed.id, seed);
      changed = true;
      continue;
    }
    // Soft-sync prompt launch offers so seeded sale + countdown activate
    // without forcing a full CMS reset for returning localStorage users.
    if (
      seed.productType === "PROMPT" &&
      seed.offer?.enabled &&
      !existing.offer?.enabled
    ) {
      byId.set(seed.id, {
        ...existing,
        offer: { ...seed.offer },
      });
      changed = true;
    }
  }
  return changed ? Array.from(byId.values()) : products;
}

function ensureImagePdpSettings(
  settings?: ImagePdpGlobalSettings,
): ImagePdpGlobalSettings {
  const defaults = defaultImagePdpGlobalSettings();
  if (!settings) return defaults;
  return {
    pricingTiers: settings.pricingTiers?.length
      ? settings.pricingTiers
      : defaults.pricingTiers,
    dealDefaults: {
      ...defaults.dealDefaults,
      ...settings.dealDefaults,
    },
  };
}

function ensureToolsSeed(tools: AiTool[]): AiTool[] {
  const byId = new Map(tools.map((t) => [t.id, t]));
  let changed = false;
  for (const seed of toolsSeedProducts) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, normalizeTool(seed));
      changed = true;
    }
  }
  return changed ? Array.from(byId.values()) : tools;
}

function normalizeLoadedState(state: AdminCmsState): AdminCmsState {
  const products = ensureMarketplaceSeedProducts(
    normalizeAdminProducts(state.products ?? []),
  );
  const collections = state.collections.map((c) => normalizeCollection(c));
  const migrated = migrateAiImageProductsToMediaLibrary(
    products,
    sanitizeMediaAssetsForStorage(state.mediaAssets ?? []),
  );
  const characters = state.characters.map((c) =>
    recomputeCharacterCounts(
      normalizeCharacter(c),
      migrated.products,
      collections,
    ),
  );
  const mediaAssets = recomputeMediaUsage(
    migrated.mediaAssets,
    migrated.products,
  );
  const syncedProducts = migrated.products.map((p) => {
    const asset = p.mediaAssetId
      ? mediaAssets.find((a) => a.id === p.mediaAssetId)
      : undefined;
    const previewVideo =
      asset?.previewPlayback === "generated" && asset.preview.url
        ? asset.preview.url
        : p.media.previewVideo && !isSeedPlaceholderVideo(p.media.previewVideo)
          ? p.media.previewVideo
          : undefined;

    let thumbnail = asset?.thumbnail.url || p.media.thumbnail;
    if (p.productType === "AI_IMAGE") {
      const cover =
        p.aiImageData?.images?.find((i) => i.isCover) ??
        p.aiImageData?.images?.[0];
      const coverAsset = cover?.mediaAssetId
        ? mediaAssets.find((a) => a.id === cover.mediaAssetId)
        : undefined;
      const coverUrl = resolveMediaAssetDisplayUrl(coverAsset);
      if (coverUrl) thumbnail = coverUrl;
    }

    return {
      ...p,
      media: {
        ...p.media,
        thumbnail,
        previewVideo,
      },
    };
  });
  return {
    ...state,
    products: syncedProducts,
    collections,
    characters,
    mediaAssets,
    imagePdpSettings: ensureImagePdpSettings(state.imagePdpSettings),
    aiTools: ensureToolsSeed(normalizeTools(state.aiTools ?? [])),
    toolsSettings: normalizeToolsSettings(state.toolsSettings),
    toolPendingChanges: normalizePendingChanges(state.toolPendingChanges),
    toolPriceHistory: normalizePriceHistory(state.toolPriceHistory),
  };
}

function persistCmsState(state: AdminCmsState) {
  const mediaAssets = sanitizeMediaAssetsForStorage(state.mediaAssets);
  const products = state.products.map((p) => ({
    ...p,
    media: {
      ...p.media,
      thumbnail:
        p.media.thumbnail?.startsWith("blob:") ? "" : p.media.thumbnail,
      previewVideo:
        !p.media.previewVideo ||
        p.media.previewVideo.startsWith("blob:") ||
        isSeedPlaceholderVideo(p.media.previewVideo)
          ? undefined
          : p.media.previewVideo,
    },
  }));
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...state, mediaAssets, products }),
  );
}

function loadState(): AdminCmsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (!needsReseed(parsed)) {
        return normalizeLoadedState(parsed as AdminCmsState);
      }
    }

    // Non-destructive migration: adopt the newest valid legacy snapshot into v8.
    for (const key of LEGACY_STORAGE_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (!legacyRaw) continue;
      try {
        const parsed = JSON.parse(legacyRaw) as unknown;
        if (needsReseed(parsed)) continue;
        const migrated = normalizeLoadedState(parsed as AdminCmsState);
        persistCmsState(migrated);
        return migrated;
      } catch {
        continue;
      }
    }

    const seed = createSeedState();
    persistCmsState(seed);
    return seed;
  } catch {
    return createSeedState();
  }
}

function recomputeAllCharacterCounts(
  characters: AdminCharacter[],
  products: AdminProduct[],
  collections: AdminCollection[],
): AdminCharacter[] {
  return characters.map((c) =>
    recomputeCharacterCounts(c, products, collections),
  );
}

function syncProductUsage(
  products: AdminProduct[],
  assets: MediaAsset[],
  product: AdminProduct,
  previousAssetId?: string,
): { products: AdminProduct[]; mediaAssets: MediaAsset[] } {
  let nextAssets = assets.map((a) => ({
    ...a,
    usedByProductIds: a.usedByProductIds.filter((pid) => pid !== product.id),
  }));

  let syncedProduct = { ...product };

  if (product.mediaAssetId) {
    const asset = nextAssets.find((a) => a.id === product.mediaAssetId);
    if (asset) {
      syncedProduct = {
        ...syncedProduct,
        media: assetToProductMedia(asset),
        duration: asset.master.duration || syncedProduct.duration,
        resolution: asset.master.resolution || syncedProduct.resolution,
        watermarkMode: product.watermarkMode ?? asset.watermarkMode,
        previewQuality: product.previewQuality ?? asset.previewQuality,
        thumbnailMode: product.thumbnailMode ?? asset.thumbnail.source,
      };
      nextAssets = nextAssets.map((a) =>
        a.id === asset.id
          ? {
              ...a,
              usedByProductIds: a.usedByProductIds.includes(product.id)
                ? a.usedByProductIds
                : [...a.usedByProductIds, product.id],
              updatedAt: new Date().toISOString(),
            }
          : a,
      );
    }
  } else if (previousAssetId) {
    // detached — leave media as-is on product or clear adapter fields lightly
  }

  const exists = products.some((p) => p.id === syncedProduct.id);
  const nextProducts = exists
    ? products.map((p) => (p.id === syncedProduct.id ? syncedProduct : p))
    : [syncedProduct, ...products];

  return { products: nextProducts, mediaAssets: nextAssets };
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AdminCmsState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const cancelJobsRef = useRef<Map<string, () => void>>(new Map());

  useEffect(() => {
    let cancelled = false;

    const hydrateFromStorage = async () => {
      const loaded = loadState();
      const mediaAssets = await rehydrateMediaObjectUrls(loaded.mediaAssets);
      const syncedMedia = recomputeMediaUsage(mediaAssets, loaded.products);
      const products = loaded.products.map((p) => {
        if (!p.mediaAssetId) return p;
        const asset = syncedMedia.find((a) => a.id === p.mediaAssetId);
        if (!asset) return p;
        return { ...p, media: assetToProductMedia(asset) };
      });
      if (cancelled) return;
      setState({
        ...loaded,
        mediaAssets: syncedMedia,
        products,
      });
      setHydrated(true);
    };

    void hydrateFromStorage();

    // Cross-tab only: StorageEvent does not fire in the writing tab.
    // Same-tab Admin + Storefront share this React context.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      void hydrateFromStorage();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persistCmsState(state);
  }, [state, hydrated]);

  useEffect(() => {
    return () => {
      cancelJobsRef.current.forEach((cancel) => cancel());
      cancelJobsRef.current.clear();
    };
  }, []);

  const pushToast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = uid("toast");
    setToasts((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const patch = useCallback((updater: (prev: AdminCmsState) => AdminCmsState) => {
    setState(updater);
  }, []);

  const updateMediaAsset = useCallback(
    (id: string, partial: Partial<MediaAsset>, toast: string | null = null) => {
      patch((prev) => {
        const mediaAssets = prev.mediaAssets.map((a) => {
          if (a.id !== id) return a;
          const nextMaster = partial.master
            ? { ...a.master, ...partial.master }
            : a.master;
          const nextPreview = partial.preview
            ? { ...a.preview, ...partial.preview }
            : a.preview;
          // Hard separation: never let a preview URL overwrite the master reference
          if (
            nextPreview.url &&
            nextMaster.url &&
            nextPreview.url === nextMaster.url &&
            nextPreview.url.startsWith("blob:")
          ) {
            nextPreview.url =
              a.preview.url !== nextMaster.url ? a.preview.url : "";
          }
          const merged: MediaAsset = {
            ...a,
            ...partial,
            master: nextMaster,
            preview: nextPreview,
            thumbnail: partial.thumbnail
              ? { ...a.thumbnail, ...partial.thumbnail }
              : a.thumbnail,
            processingSteps: partial.processingSteps
              ? { ...a.processingSteps, ...partial.processingSteps }
              : a.processingSteps,
            watermarkConfig: partial.watermarkConfig
              ? { ...a.watermarkConfig, ...partial.watermarkConfig }
              : a.watermarkConfig,
            updatedAt: partial.updatedAt ?? new Date().toISOString(),
          };
          return merged;
        });

        // Keep product.media adapters in sync when attached asset changes
        const products = prev.products.map((p) => {
          if (!p.mediaAssetId || p.mediaAssetId !== id) return p;
          const asset = mediaAssets.find((a) => a.id === id);
          if (!asset) return p;
          const media = assetToProductMedia(asset);
          // Admin product thumb = clean master. Storefront reads preview from the asset.
          if (asset.type === "image") {
            media.thumbnail =
              asset.master.url ||
              (asset.thumbnail.url !== asset.preview.url
                ? asset.thumbnail.url
                : "") ||
              media.thumbnail;
          }
          return { ...p, media };
        });

        return { ...prev, mediaAssets, products };
      });
      if (toast) pushToast(toast);
    },
    [patch, pushToast],
  );

  const upsertMediaAsset = useCallback(
    (asset: MediaAsset, toast = "Media asset saved") => {
      patch((prev) => {
        const exists = prev.mediaAssets.some((a) => a.id === asset.id);
        return {
          ...prev,
          mediaAssets: exists
            ? prev.mediaAssets.map((a) => (a.id === asset.id ? asset : a))
            : [asset, ...prev.mediaAssets],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const deleteMediaAsset = useCallback(
    (id: string) => {
      const cancel = cancelJobsRef.current.get(id);
      if (cancel) {
        cancel();
        cancelJobsRef.current.delete(id);
      }
      void deleteMediaBlobs(id);
      patch((prev) => {
        const products = prev.products.map((p) => {
          let next = p;
          if (p.mediaAssetId === id) {
            next = {
              ...next,
              mediaAssetId: undefined,
              updatedAt: new Date().toISOString(),
            };
          }
          const images = next.aiImageData?.images;
          if (images?.some((img) => img.mediaAssetId === id)) {
            const nextImages = images.filter((img) => img.mediaAssetId !== id);
            next = {
              ...next,
              aiImageData: {
                ...(next.aiImageData ?? { images: [] }),
                images: nextImages,
              },
              updatedAt: new Date().toISOString(),
            };
          }
          return next;
        });
        return {
          ...prev,
          mediaAssets: prev.mediaAssets.filter((a) => a.id !== id),
          products,
        };
      });
      pushToast("Media asset deleted", "info");
    },
    [patch, pushToast],
  );

  const setMediaSettings = useCallback(
    (settings: GlobalMediaSettings, toast = "Media settings saved") => {
      patch((prev) => {
        const wmChanged =
          JSON.stringify(prev.mediaSettings.watermark) !==
          JSON.stringify(settings.watermark);
        const qualityChanged =
          prev.mediaSettings.defaultPreviewQuality !==
          settings.defaultPreviewQuality;
        const mediaAssets =
          wmChanged || qualityChanged
            ? prev.mediaAssets.map((a) =>
                a.watermarkMode === "global" || qualityChanged
                  ? { ...a, previewStale: true, updatedAt: new Date().toISOString() }
                  : a,
              )
            : prev.mediaAssets;
        return { ...prev, mediaSettings: settings, mediaAssets };
      });
      pushToast(
        toast +
          (toast.includes("regenerate")
            ? ""
            : " — regenerate previews to apply watermark/quality"),
      );
    },
    [patch, pushToast],
  );

  const setImagePdpSettings = useCallback(
    (settings: ImagePdpGlobalSettings, toast = "Image PDP settings saved") => {
      patch((prev) => ({
        ...prev,
        imagePdpSettings: ensureImagePdpSettings(settings),
      }));
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const mediaAssetsRef = useRef(state.mediaAssets);
  mediaAssetsRef.current = state.mediaAssets;
  const mediaSettingsRef = useRef(state.mediaSettings);
  mediaSettingsRef.current = state.mediaSettings;

  const startProcessingJob = useCallback(
    (asset: MediaAsset) => {
      const existing = cancelJobsRef.current.get(asset.id);
      if (existing) existing();

      // Prefer the latest asset snapshot so master blob URLs are not stale.
      const live =
        mediaAssetsRef.current.find((a) => a.id === asset.id) ?? asset;

      const cancel = simulateProcessing(
        live,
        (partial) => {
          updateMediaAsset(live.id, partial, null);
        },
        async (snapshot) => {
          const settings = mediaSettingsRef.current;
          const wm =
            snapshot.watermarkMode === "custom" && snapshot.watermarkConfig
              ? {
                  ...settings.watermark,
                  ...snapshot.watermarkConfig,
                  enabled:
                    snapshot.watermarkConfig.enabled ??
                    settings.watermark.enabled,
                }
              : settings.watermark;
          // Re-read again at encode time (IndexedDB / session URL may have landed).
          const fresh =
            mediaAssetsRef.current.find((a) => a.id === snapshot.id) ??
            snapshot;
          await materializePreviewAndThumbnail(
            fresh,
            (partial) => {
              updateMediaAsset(fresh.id, partial, null);
            },
            {
              quality: fresh.previewQuality ?? settings.defaultPreviewQuality,
              watermark: wm,
              skipThumbnail: fresh.type === "image",
            },
          );
        },
      );
      cancelJobsRef.current.set(asset.id, cancel);
    },
    [updateMediaAsset],
  );

  const regenerateMediaPreview = useCallback(
    (assetId: string) => {
      const asset = mediaAssetsRef.current.find((a) => a.id === assetId);
      if (!asset) {
        pushToast("Media asset not found", "error");
        return;
      }
      startProcessingJob(asset);
      pushToast("Regenerating preview — master file is unchanged");
    },
    [pushToast, startProcessingJob],
  );

  // One-time: bake watermarked previews for assets that have a master blob
  // but no generated preview yet (images + videos). Sequential to avoid hangs.
  const previewKickoffRef = useRef(false);
  useEffect(() => {
    if (!hydrated || previewKickoffRef.current) return;

    let cancelled = false;
    let started = false;

    const boot = window.setTimeout(() => {
      if (cancelled || previewKickoffRef.current) return;
      previewKickoffRef.current = true;
      started = true;

      const pendingIds = mediaAssetsRef.current
        .filter((a) => {
          if (a.preview.watermarkApplied) return false;
          if (a.previewPlayback === "generated") return false;
          if (
            a.processingStatus === "processing" ||
            a.processingStatus === "uploading" ||
            a.processingStatus === "failed"
          ) {
            return false;
          }
          // Need a real master source to encode from
          const hasMaster =
            Boolean(a.hasLocalBlob) ||
            (Boolean(a.master.url) &&
              !a.master.url.startsWith("blob:") &&
              !isSeedPlaceholderVideo(a.master.url));
          return hasMaster;
        })
        .map((a) => a.id);

      let index = 0;

      const runNext = () => {
        if (cancelled || index >= pendingIds.length) return;
        const id = pendingIds[index++];
        const asset = mediaAssetsRef.current.find((a) => a.id === id);
        if (
          !asset ||
          asset.preview.watermarkApplied ||
          asset.previewPlayback === "generated" ||
          asset.processingStatus === "processing" ||
          asset.processingStatus === "uploading"
        ) {
          window.setTimeout(runNext, 0);
          return;
        }
        startProcessingJob(asset);
        const startedAt = Date.now();
        const poll = window.setInterval(() => {
          const live = mediaAssetsRef.current.find((a) => a.id === id);
          const done =
            !live ||
            live.processingStatus === "ready" ||
            live.processingStatus === "failed" ||
            live.preview.watermarkApplied ||
            live.previewPlayback === "generated" ||
            Date.now() - startedAt > 95_000;
          if (done) {
            window.clearInterval(poll);
            window.setTimeout(runNext, 200);
          }
        }, 400);
      };

      runNext();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(boot);
      if (!started) {
        previewKickoffRef.current = false;
      }
    };
  }, [hydrated, startProcessingJob]);

  const uploadMasterVideos = useCallback(
    async (files: File[]): Promise<string[]> => {
      const ids: string[] = [];

      for (const file of files) {
        const id = uid("media");
        const stamp = new Date().toISOString();
        const baseName = file.name.replace(/\.[^.]+$/, "") || "Untitled video";

        const placeholder: MediaAsset = {
          id,
          name: baseName,
          originalFileName: file.name,
          type: "video",
          master: {
            url: "",
            fileName: file.name,
            sizeBytes: file.size,
            sizeLabel: formatSizeBytes(file.size),
            resolution: "1080x1920",
            duration: "0:15",
            durationSeconds: 15,
            access: "protected",
          },
          preview: {
            url: "",
            status: "uploading",
            resolution: state.mediaSettings.previewResolution,
            quality: state.mediaSettings.defaultPreviewQuality,
            watermarkApplied: false,
            access: "public",
          },
          thumbnail: {
            url: "",
            source: "frame",
            timestamp: 0,
            timestampLabel: formatTimestamp(0),
          },
          processingStatus: "uploading",
          processingSteps: { ...EMPTY_PROCESSING_STEPS },
          watermarkMode: "global",
          previewQuality: state.mediaSettings.defaultPreviewQuality,
          usedByProductIds: [],
          hasLocalBlob: true,
          previewPlayback: "none",
          createdAt: stamp,
          updatedAt: stamp,
        };

        patch((prev) => ({
          ...prev,
          mediaAssets: [placeholder, ...prev.mediaAssets],
        }));
        ids.push(id);

        try {
          // Durable original in IndexedDB; object URL is session-only
          const objectUrl = await persistOriginalUpload(id, file, file.name);
          const meta = await probeVideoFile(file).catch(() => null);
          const durationSeconds =
            meta?.durationSeconds && meta.durationSeconds > 0
              ? meta.durationSeconds
              : 15;
          const resolution =
            meta?.width && meta?.height
              ? `${meta.width}x${meta.height}`
              : "1080x1920";
          const readyForProcess: MediaAsset = {
            ...placeholder,
            master: {
              ...placeholder.master,
              url: objectUrl,
              sizeBytes: file.size,
              sizeLabel: formatSizeBytes(file.size),
              duration: formatDuration(durationSeconds),
              durationSeconds,
              resolution,
            },
            preview: {
              ...placeholder.preview,
              url: "",
              status: "uploaded",
              resolution: "",
              watermarkApplied: false,
            },
            thumbnail: {
              ...placeholder.thumbnail,
              url: "",
            },
            processingStatus: "uploaded",
            processingSteps: {
              ...EMPTY_PROCESSING_STEPS,
              uploadComplete: true,
            },
            hasLocalBlob: true,
            // Master is admin-only until a real derivative exists
            previewPlayback: "none",
            updatedAt: new Date().toISOString(),
          };

          patch((prev) => ({
            ...prev,
            mediaAssets: prev.mediaAssets.map((a) =>
              a.id === id ? readyForProcess : a,
            ),
          }));

          startProcessingJob(readyForProcess);
        } catch {
          updateMediaAsset(
            id,
            {
              processingStatus: "failed",
              processingError: "Upload failed — could not persist video",
              preview: { ...placeholder.preview, status: "failed" },
              previewPlayback: "none",
            },
            null,
          );
          pushToast(`Failed to upload ${file.name}`, "error");
        }
      }

      if (ids.length) {
        pushToast(
          ids.length === 1
            ? "Video uploaded — processing started"
            : `${ids.length} videos uploaded — processing started`,
        );
      }

      return ids;
    },
    [
      patch,
      pushToast,
      startProcessingJob,
      state.mediaSettings.defaultPreviewQuality,
      state.mediaSettings.previewResolution,
      updateMediaAsset,
    ],
  );

  const uploadMasterImages = useCallback(
    async (files: File[]): Promise<string[]> => {
      const ids: string[] = [];

      for (const file of files) {
        const id = uid("media");
        try {
          const objectUrl = await persistOriginalUpload(id, file, file.name);
          const meta = await probeImageFile(file).catch(() => null);
          const asset = buildUploadedImageAssetFromFile({
            id,
            file,
            objectUrl,
            width: meta?.width,
            height: meta?.height,
            previewQuality: state.mediaSettings.defaultPreviewQuality,
          });

          patch((prev) => ({
            ...prev,
            mediaAssets: [asset, ...prev.mediaAssets],
          }));
          ids.push(id);
          startProcessingJob(asset);
        } catch {
          pushToast(`Failed to upload ${file.name}`, "error");
        }
      }

      if (ids.length) {
        pushToast(
          ids.length === 1
            ? "Image uploaded — generating watermarked preview"
            : `${ids.length} images uploaded — generating previews`,
        );
      }

      return ids;
    },
    [
      patch,
      pushToast,
      startProcessingJob,
      state.mediaSettings.defaultPreviewQuality,
    ],
  );

  const replaceMasterVideo = useCallback(
    async (assetId: string, file: File) => {
      const existing = state.mediaAssets.find((a) => a.id === assetId);
      if (!existing) {
        pushToast("Media asset not found", "error");
        return;
      }

      try {
        const objectUrl = await persistOriginalUpload(assetId, file, file.name);
        const meta = await probeVideoFile(file).catch(() => null);
        const durationSeconds =
          meta?.durationSeconds && meta.durationSeconds > 0
            ? meta.durationSeconds
            : existing.master.durationSeconds || 15;
        const resolution =
          meta?.width && meta?.height
            ? `${meta.width}x${meta.height}`
            : existing.master.resolution || "1080x1920";

        const readyForProcess: MediaAsset = {
          ...existing,
          name: existing.name || file.name.replace(/\.[^.]+$/, ""),
          originalFileName: file.name,
          master: {
            ...existing.master,
            url: objectUrl,
            fileName: file.name,
            sizeBytes: file.size,
            sizeLabel: formatSizeBytes(file.size),
            duration: formatDuration(durationSeconds),
            durationSeconds,
            resolution,
            access: "protected",
          },
          preview: {
            ...existing.preview,
            url: "",
            status: "uploaded",
            resolution: "",
            sizeBytes: undefined,
            sizeLabel: undefined,
            watermarkApplied: false,
          },
          processingStatus: "uploaded",
          processingError: undefined,
          processingSteps: {
            ...EMPTY_PROCESSING_STEPS,
            uploadComplete: true,
          },
          hasLocalBlob: true,
          previewPlayback: "none",
          previewStale: false,
          updatedAt: new Date().toISOString(),
        };

        patch((prev) => {
          const mediaAssets = prev.mediaAssets.map((a) =>
            a.id === assetId ? readyForProcess : a,
          );
          const products = prev.products.map((p) => {
            if (p.mediaAssetId !== assetId) return p;
            return { ...p, media: assetToProductMedia(readyForProcess) };
          });
          return { ...prev, mediaAssets, products };
        });

        startProcessingJob(readyForProcess);
        pushToast("Master replaced — generating customer preview");
      } catch {
        updateMediaAsset(
          assetId,
          {
            processingStatus: "failed",
            processingError: "Could not replace master video",
            previewPlayback: "none",
          },
          null,
        );
        pushToast("Failed to replace master video", "error");
      }
    },
    [
      patch,
      pushToast,
      startProcessingJob,
      state.mediaAssets,
      updateMediaAsset,
    ],
  );

  const attachMediaToProduct = useCallback(
    (productId: string, assetId: string) => {
      let attached = false;
      patch((prev) => {
        const product = prev.products.find((p) => p.id === productId);
        const asset = prev.mediaAssets.find((a) => a.id === assetId);
        if (!product || !asset) return prev;

        // Image masters attach to AI_IMAGE products the same way videos attach
        // (single mediaAssetId). Stills cannot attach as video masters.
        if (
          asset.type === "image" &&
          product.productType !== "AI_IMAGE"
        ) {
          return prev;
        }

        const previousAssetId = product.mediaAssetId;
        const adapted = assetToProductMedia(asset);
        const thumb =
          asset.type === "image"
            ? asset.master.url ||
              (asset.thumbnail.url !== asset.preview.url
                ? asset.thumbnail.url
                : "") ||
              adapted.thumbnail
            : adapted.thumbnail;
        const nextProduct: AdminProduct = {
          ...product,
          mediaAssetId: assetId,
          media: {
            ...adapted,
            thumbnail: thumb,
          },
          duration:
            asset.type === "video"
              ? asset.master.duration
              : product.duration,
          resolution: asset.master.resolution || product.resolution,
          watermarkMode: asset.watermarkMode,
          previewQuality: asset.previewQuality,
          thumbnailMode: asset.thumbnail.source,
          aiImageData:
            product.productType === "AI_IMAGE"
              ? {
                  ...(product.aiImageData ?? { images: [] }),
                  images: [],
                }
              : product.aiImageData,
          updatedAt: new Date().toISOString(),
        };

        const synced = syncProductUsage(
          prev.products,
          prev.mediaAssets,
          nextProduct,
          previousAssetId,
        );
        attached = true;
        return { ...prev, ...synced };
      });
      if (attached) pushToast("Media attached to product");
    },
    [patch, pushToast],
  );

  const detachMediaFromProduct = useCallback(
    (productId: string) => {
      patch((prev) => {
        const product = prev.products.find((p) => p.id === productId);
        if (!product) return prev;
        const nextProduct: AdminProduct = {
          ...product,
          mediaAssetId: undefined,
          updatedAt: new Date().toISOString(),
        };
        const synced = syncProductUsage(
          prev.products,
          prev.mediaAssets,
          nextProduct,
          product.mediaAssetId,
        );
        return { ...prev, ...synced };
      });
      pushToast("Media detached", "info");
    },
    [patch, pushToast],
  );

  const attachImageAssetToAiProduct = useCallback(
    (productId: string, assetId: string) => {
      attachMediaToProduct(productId, assetId);
    },
    [attachMediaToProduct],
  );

  const detachImageAssetFromAiProduct = useCallback(
    (productId: string, assetId: string) => {
      patch((prev) => {
        const product = prev.products.find((p) => p.id === productId);
        if (!product || product.productType !== "AI_IMAGE") return prev;
        const images = product.aiImageData?.images ?? [];
        if (!images.some((img) => img.mediaAssetId === assetId)) return prev;
        const nextImages = images.filter((img) => img.mediaAssetId !== assetId);
        const cover =
          nextImages.find((i) => i.isCover) ?? nextImages[0];
        if (cover && !cover.isCover) {
          cover.isCover = true;
        }
        const coverAsset = cover?.mediaAssetId
          ? prev.mediaAssets.find((a) => a.id === cover.mediaAssetId)
          : undefined;
        const nextProduct: AdminProduct = {
          ...product,
          aiImageData: {
            ...(product.aiImageData ?? { images: [] }),
            images: nextImages,
          },
          media: {
            ...product.media,
            thumbnail: resolveMediaAssetDisplayUrl(coverAsset) || "",
          },
          updatedAt: new Date().toISOString(),
        };
        const products = prev.products.map((p) =>
          p.id === productId ? nextProduct : p,
        );
        return {
          ...prev,
          products,
          mediaAssets: recomputeMediaUsage(prev.mediaAssets, products),
        };
      });
      pushToast("Image removed from product", "info");
    },
    [patch, pushToast],
  );

  const upsertProduct = useCallback(
    (product: AdminProduct, toast = "Product saved") => {
      patch((prev) => {
        const previous = prev.products.find((p) => p.id === product.id);
        const synced = syncProductUsage(
          prev.products,
          prev.mediaAssets,
          {
            ...product,
            updatedAt: product.updatedAt || new Date().toISOString(),
          },
          previous?.mediaAssetId,
        );

        // Auto-append to collections with future-include character rules
        const collections = prev.collections.map((col) => {
          const rules = col.characterRules ?? [];
          const shouldAdd = rules.some(
            (r) =>
              r.characterId === product.characterId &&
              r.automaticallyIncludeFutureProducts,
          );
          if (!shouldAdd || col.productIds.includes(product.id)) return col;
          return {
            ...col,
            productIds: [...col.productIds, product.id],
            updatedAt: new Date().toISOString(),
          };
        });

        const characters = recomputeAllCharacterCounts(
          prev.characters,
          synced.products,
          collections,
        );

        return {
          ...prev,
          ...synced,
          mediaAssets: recomputeMediaUsage(synced.mediaAssets, synced.products),
          collections,
          characters,
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const duplicateProduct = useCallback(
    (id: string) => {
      const source = state.products.find((p) => p.id === id);
      if (!source) return null;
      const copy: AdminProduct = {
        ...structuredClone(source),
        id: uid("vid"),
        name: `${source.name} (Copy)`,
        slug: `${source.slug}-copy`,
        status: "draft",
        sales: 0,
        revenueInr: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      upsertProduct(copy, "Product duplicated");
      return copy;
    },
    [state.products, upsertProduct],
  );

  const archiveProduct = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === id
            ? { ...p, status: "archived", updatedAt: new Date().toISOString() }
            : p,
        ),
      }));
      pushToast("Product archived");
    },
    [patch, pushToast],
  );

  const deleteProduct = useCallback(
    (id: string) => {
      patch((prev) => {
        const products = prev.products.filter((p) => p.id !== id);
        return {
          ...prev,
          products,
          mediaAssets: prev.mediaAssets.map((a) => ({
            ...a,
            usedByProductIds: a.usedByProductIds.filter((pid) => pid !== id),
          })),
          characters: recomputeAllCharacterCounts(
            prev.characters,
            products,
            prev.collections,
          ),
        };
      });
      pushToast("Product deleted", "info");
    },
    [patch, pushToast],
  );

  const upsertCharacter = useCallback(
    (character: AdminCharacter, toast = "Character saved") => {
      patch((prev) => {
        const normalized = normalizeCharacter({
          ...character,
          updatedAt: character.updatedAt || new Date().toISOString(),
        });

        // Sync characterName on all products belonging to this character
        const products = prev.products.map((p) =>
          p.characterId === normalized.id
            ? {
                ...p,
                characterName: normalized.name,
                updatedAt: new Date().toISOString(),
              }
            : p,
        );

        const withCounts = recomputeCharacterCounts(
          normalized,
          products,
          prev.collections,
        );

        const exists = prev.characters.some((c) => c.id === withCounts.id);
        const characters = exists
          ? prev.characters.map((c) =>
              c.id === withCounts.id ? withCounts : c,
            )
          : [withCounts, ...prev.characters];

        return {
          ...prev,
          products,
          characters: recomputeAllCharacterCounts(
            characters,
            products,
            prev.collections,
          ),
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const duplicateCharacter = useCallback(
    (id: string) => {
      const source = state.characters.find((c) => c.id === id);
      if (!source) return null;
      const stamp = new Date().toISOString();
      const copy = normalizeCharacter({
        ...structuredClone(source),
        id: uid("char"),
        name: `${source.name} (Copy)`,
        slug: `${source.slug}-copy`,
        status: "draft",
        featured: false,
        featuredProductId: undefined,
        featuredCollectionId: undefined,
        createdAt: stamp,
        updatedAt: stamp,
      });
      upsertCharacter(copy, "Character duplicated");
      return copy;
    },
    [state.characters, upsertCharacter],
  );

  const deleteCharacter = useCallback(
    (id: string) => {
      let failed = false;
      patch((prev) => {
        const remaining = prev.characters.filter((c) => c.id !== id);
        if (remaining.length === 0) {
          failed = true;
          return prev;
        }

        const fallback =
          remaining.find((c) => c.status === "active") ?? remaining[0];

        const products = prev.products.map((p) =>
          p.characterId === id
            ? {
                ...p,
                characterId: fallback.id,
                characterName: fallback.name,
                updatedAt: new Date().toISOString(),
              }
            : p,
        );

        const characters = recomputeAllCharacterCounts(
          remaining,
          products,
          prev.collections,
        );

        return { ...prev, characters, products };
      });
      if (failed) {
        pushToast("Assign at least one character", "error");
        return;
      }
      pushToast("Character deleted — products reassigned", "info");
    },
    [patch, pushToast],
  );

  const assignProductsToCharacter = useCallback(
    (characterId: string, productIds: string[]) => {
      patch((prev) => {
        const character = prev.characters.find((c) => c.id === characterId);
        if (!character || !productIds.length) return prev;

        const idSet = new Set(productIds);
        const products = prev.products.map((p) =>
          idSet.has(p.id)
            ? {
                ...p,
                characterId,
                characterName: character.name,
                updatedAt: new Date().toISOString(),
              }
            : p,
        );

        return {
          ...prev,
          products,
          characters: recomputeAllCharacterCounts(
            prev.characters,
            products,
            prev.collections,
          ),
        };
      });
      pushToast(
        productIds.length === 1
          ? "Product assigned to character"
          : `${productIds.length} products assigned to character`,
      );
    },
    [patch, pushToast],
  );

  const removeProductFromCharacter = useCallback(
    (productId: string, characterId: string) => {
      let error: string | null = null;
      let reassignedName = "";
      patch((prev) => {
        const product = prev.products.find((p) => p.id === productId);
        if (!product || product.characterId !== characterId) return prev;

        const others = prev.characters.filter(
          (c) => c.id !== characterId && c.status === "active",
        );
        const fallback =
          others[0] ??
          prev.characters.find((c) => c.id !== characterId);

        if (!fallback) {
          error = "Assign at least one character";
          return prev;
        }

        reassignedName = fallback.name;
        const products = prev.products.map((p) =>
          p.id === productId
            ? {
                ...p,
                characterId: fallback.id,
                characterName: fallback.name,
                updatedAt: new Date().toISOString(),
              }
            : p,
        );

        return {
          ...prev,
          products,
          characters: recomputeAllCharacterCounts(
            prev.characters,
            products,
            prev.collections,
          ),
        };
      });

      if (error) {
        pushToast(error, "error");
        return;
      }
      pushToast(
        `Removed from character — product remains in store (now under ${reassignedName})`,
        "info",
      );
    },
    [patch, pushToast],
  );

  const upsertCollection = useCallback(
    (collection: AdminCollection, toast = "Collection saved") => {
      const normalized = normalizeCollection(collection);
      patch((prev) => {
        const exists = prev.collections.some((c) => c.id === normalized.id);
        return {
          ...prev,
          collections: exists
            ? prev.collections.map((c) =>
                c.id === normalized.id ? normalized : c,
              )
            : [normalized, ...prev.collections],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const duplicateCollection = useCallback(
    (id: string) => {
      const source = state.collections.find((c) => c.id === id);
      if (!source) return null;
      const copy = normalizeCollection({
        ...structuredClone(source),
        id: uid("col"),
        name: `${source.name} (Copy)`,
        slug: `${source.slug}-copy`,
        status: "draft",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      upsertCollection(copy, "Collection duplicated");
      return copy;
    },
    [state.collections, upsertCollection],
  );

  const deleteCollection = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        collections: prev.collections.filter((c) => c.id !== id),
      }));
      pushToast("Collection deleted", "info");
    },
    [patch, pushToast],
  );

  const upsertCampaign = useCallback(
    (campaign: AdminCampaign, toast = "Campaign saved") => {
      patch((prev) => {
        const exists = prev.campaigns.some((c) => c.id === campaign.id);
        return {
          ...prev,
          campaigns: exists
            ? prev.campaigns.map((c) => (c.id === campaign.id ? campaign : c))
            : [campaign, ...prev.campaigns],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const deleteCampaign = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        campaigns: prev.campaigns.filter((c) => c.id !== id),
      }));
      pushToast("Campaign deleted", "info");
    },
    [patch, pushToast],
  );

  const upsertOffer = useCallback(
    (offer: AdminOffer, toast = "Offer saved") => {
      patch((prev) => {
        const exists = prev.offers.some((o) => o.id === offer.id);
        return {
          ...prev,
          offers: exists
            ? prev.offers.map((o) => (o.id === offer.id ? offer : o))
            : [offer, ...prev.offers],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const deleteOffer = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        offers: prev.offers.filter((o) => o.id !== id),
      }));
      pushToast("Offer deleted", "info");
    },
    [patch, pushToast],
  );

  const upsertAnnouncement = useCallback(
    (announcement: Announcement, toast = "Announcement saved") => {
      patch((prev) => {
        const exists = prev.announcements.some((a) => a.id === announcement.id);
        return {
          ...prev,
          announcements: exists
            ? prev.announcements.map((a) =>
                a.id === announcement.id ? announcement : a,
              )
            : [announcement, ...prev.announcements],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const deleteAnnouncement = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        announcements: prev.announcements.filter((a) => a.id !== id),
      }));
      pushToast("Announcement deleted", "info");
    },
    [patch, pushToast],
  );

  const setHomepageSections = useCallback(
    (sections: HomepageSection[], toast: string | null = "Homepage sections updated") => {
      patch((prev) => ({ ...prev, homepageSections: sections }));
      if (toast) pushToast(toast);
    },
    [patch, pushToast],
  );

  const setHomepageHero = useCallback(
    (hero: HomepageHeroConfig, toast: string | null = "Hero updated") => {
      patch((prev) => ({ ...prev, homepageHero: hero }));
      if (toast) pushToast(toast);
    },
    [patch, pushToast],
  );

  const markNotificationRead = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        notifications: prev.notifications.map((n: AdminNotification) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
    },
    [patch],
  );

  const markAllNotificationsRead = useCallback(() => {
    patch((prev) => ({
      ...prev,
      notifications: prev.notifications.map((n) => ({ ...n, read: true })),
    }));
  }, [patch]);

  const resetStore = useCallback(() => {
    cancelJobsRef.current.forEach((cancel) => cancel());
    cancelJobsRef.current.clear();
    const seed = createSeedState();
    setState(seed);
    persistCmsState(seed);
    pushToast("Store reset to seed data");
  }, [pushToast]);

  const upsertAiTool = useCallback(
    (tool: AiTool, toast = "Tool saved") => {
      const next = normalizeTool({
        ...tool,
        updatedAt: new Date().toISOString(),
      });
      patch((prev) => {
        const exists = prev.aiTools.some((t) => t.id === next.id);
        return {
          ...prev,
          aiTools: exists
            ? prev.aiTools.map((t) => (t.id === next.id ? next : t))
            : [next, ...prev.aiTools],
        };
      });
      pushToast(toast);
    },
    [patch, pushToast],
  );

  const deleteAiTool = useCallback(
    (id: string) => {
      patch((prev) => ({
        ...prev,
        aiTools: prev.aiTools.filter((t) => t.id !== id),
        toolPendingChanges: prev.toolPendingChanges.filter(
          (c) => c.toolId !== id,
        ),
      }));
      pushToast("Tool deleted");
    },
    [patch, pushToast],
  );

  const setToolsSettings = useCallback(
    (settings: ToolsSettings, toast: string | null = "Tools settings saved") => {
      patch((prev) => ({
        ...prev,
        toolsSettings: normalizeToolsSettings(settings),
      }));
      if (toast) pushToast(toast);
    },
    [patch, pushToast],
  );

  const resolveToolPendingChange = useCallback(
    (
      changeId: string,
      action: "approve" | "reject" | "edit",
      edited?: Partial<AiTool>,
    ) => {
      patch((prev) => {
        const change = prev.toolPendingChanges.find((c) => c.id === changeId);
        if (!change) return prev;
        let aiTools = prev.aiTools;
        if (action === "approve" || action === "edit") {
          aiTools = prev.aiTools.map((t) => {
            if (t.id !== change.toolId) return t;
            const detected = change.detectedSnapshot;
            const base: AiTool = {
              ...t,
              pricing: {
                ...t.pricing,
                regularPrice:
                  detected.regularPrice ?? t.pricing.regularPrice,
                currentPrice:
                  detected.currentPrice ??
                  detected.salePrice ??
                  t.pricing.currentPrice,
                origin: "verified",
              },
              offer: {
                ...t.offer,
                saleActive: detected.saleActive ?? t.offer.saleActive,
                saleTitle: detected.saleTitle ?? t.offer.saleTitle,
                salePrice: detected.salePrice ?? t.offer.salePrice,
                discountPercent:
                  detected.discountPercent ?? t.offer.discountPercent,
                saleEndDate: detected.saleEndDate ?? t.offer.saleEndDate,
                regularPrice: detected.regularPrice ?? t.offer.regularPrice,
                origin: "verified",
              },
              monitoring: {
                ...t.monitoring,
                status: "up_to_date",
                lastCheckedAt: new Date().toISOString(),
                lastVerifiedAt: new Date().toISOString(),
                currentDetectedPrice:
                  detected.currentPrice ?? detected.salePrice,
              },
              updatedAt: new Date().toISOString(),
              ...edited,
            };
            return normalizeTool(base);
          });
        } else {
          aiTools = prev.aiTools.map((t) =>
            t.id === change.toolId
              ? normalizeTool({
                  ...t,
                  monitoring: {
                    ...t.monitoring,
                    status: "up_to_date",
                    lastCheckedAt: new Date().toISOString(),
                  },
                })
              : t,
          );
        }
        const historyEntry = {
          id: uid("tph"),
          toolId: change.toolId,
          detectedAt: new Date().toISOString(),
          previousValue: JSON.stringify(change.previousSnapshot),
          newValue: JSON.stringify(change.detectedSnapshot),
          changeType:
            change.changeKind === "sale"
              ? ("sale_started" as const)
              : ("price_decrease" as const),
          sourceUrl: change.sourceUrl,
          confidence: change.confidence,
          applied: action !== "reject",
          appliedBy: "manual" as const,
          origin: "verified" as const,
        };
        return {
          ...prev,
          aiTools,
          toolPendingChanges: prev.toolPendingChanges.map((c) =>
            c.id === changeId
              ? {
                  ...c,
                  status: action === "reject" ? "rejected" : "approved",
                }
              : c,
          ),
          toolPriceHistory: [historyEntry, ...prev.toolPriceHistory],
        };
      });
      pushToast(
        action === "reject"
          ? "Change rejected"
          : action === "edit"
            ? "Change applied with edits"
            : "Change approved",
      );
    },
    [patch, pushToast],
  );

  const value = useMemo<AdminContextValue>(
    () => ({
      ...state,
      hydrated,
      toasts,
      pushToast,
      dismissToast,
      upsertProduct,
      duplicateProduct,
      archiveProduct,
      deleteProduct,
      upsertCharacter,
      duplicateCharacter,
      deleteCharacter,
      assignProductsToCharacter,
      removeProductFromCharacter,
      upsertCollection,
      duplicateCollection,
      deleteCollection,
      upsertCampaign,
      deleteCampaign,
      upsertOffer,
      deleteOffer,
      upsertAnnouncement,
      deleteAnnouncement,
      setHomepageSections,
      setHomepageHero,
      markNotificationRead,
      markAllNotificationsRead,
      resetStore,
      upsertMediaAsset,
      updateMediaAsset,
      deleteMediaAsset,
      setMediaSettings,
      setImagePdpSettings,
      uploadMasterVideos,
      uploadMasterImages,
      replaceMasterVideo,
      regenerateMediaPreview,
      attachMediaToProduct,
      detachMediaFromProduct,
      attachImageAssetToAiProduct,
      detachImageAssetFromAiProduct,
      upsertAiTool,
      deleteAiTool,
      setToolsSettings,
      resolveToolPendingChange,
    }),
    [
      state,
      hydrated,
      toasts,
      pushToast,
      dismissToast,
      upsertProduct,
      duplicateProduct,
      archiveProduct,
      deleteProduct,
      upsertCharacter,
      duplicateCharacter,
      deleteCharacter,
      assignProductsToCharacter,
      removeProductFromCharacter,
      upsertCollection,
      duplicateCollection,
      deleteCollection,
      upsertCampaign,
      deleteCampaign,
      upsertOffer,
      deleteOffer,
      upsertAnnouncement,
      deleteAnnouncement,
      setHomepageSections,
      setHomepageHero,
      markNotificationRead,
      markAllNotificationsRead,
      resetStore,
      upsertMediaAsset,
      updateMediaAsset,
      deleteMediaAsset,
      setMediaSettings,
      setImagePdpSettings,
      uploadMasterVideos,
      uploadMasterImages,
      replaceMasterVideo,
      regenerateMediaPreview,
      attachMediaToProduct,
      detachMediaFromProduct,
      attachImageAssetToAiProduct,
      detachImageAssetFromAiProduct,
      upsertAiTool,
      deleteAiTool,
      setToolsSettings,
      resolveToolPendingChange,
    ],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
