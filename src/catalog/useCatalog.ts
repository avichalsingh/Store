"use client";

import { useAdmin } from "@/admin/store/AdminProvider";
import {
  buildStaticCatalog,
  buildStorefrontCatalog,
  type StorefrontCatalog,
} from "@/catalog/mapAdminToStorefront";
import { useMemo } from "react";

export type LiveCatalog = StorefrontCatalog & { hydrated: boolean };

/**
 * Live storefront catalog derived from the shared Admin CMS state.
 * Always prefer this over importing `@/data/videos` directly.
 *
 * The returned object is referentially stable when CMS inputs are unchanged.
 */
export function useCatalog(): LiveCatalog {
  const {
    products,
    mediaAssets,
    collections,
    characters,
    imagePdpSettings,
    hydrated,
  } = useAdmin();

  return useMemo(() => {
    const catalog = hydrated
      ? buildStorefrontCatalog(
          products,
          mediaAssets,
          collections,
          characters,
          imagePdpSettings,
        )
      : buildStaticCatalog();
    return { ...catalog, hydrated };
  }, [products, mediaAssets, collections, characters, imagePdpSettings, hydrated]);
}
