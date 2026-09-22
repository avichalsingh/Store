"use client";

import { useAdmin } from "@/admin/store/AdminProvider";
import {
  assembleStorefrontCatalogFromProducts,
  buildStaticCatalog,
  type StorefrontCatalog,
} from "@/catalog/mapAdminToStorefront";
import type { CatalogProduct } from "@/types";
import { useEffect, useMemo, useState } from "react";

type CatalogApiResponse = {
  products: CatalogProduct[];
  error?: string;
};

export type LiveCatalog = StorefrontCatalog & {
  hydrated: boolean;
  /** Set when the Supabase catalog request fails. */
  error: string | null;
};

/**
 * Storefront catalog: products from Supabase public catalog views via /api/catalog.
 * Collections / characters / image PDP settings still come from Admin CMS (localStorage).
 * Does not mix CMS products into the storefront product list.
 */
export function useCatalog(): LiveCatalog {
  const { collections, characters, imagePdpSettings } = useAdmin();

  const [products, setProducts] = useState<CatalogProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/catalog");
        const body = (await res.json()) as CatalogApiResponse;
        if (cancelled) return;
        if (!res.ok || body.error) {
          setProducts([]);
          setError(body.error || `Catalog request failed (${res.status})`);
        } else {
          setProducts(body.products ?? []);
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        setProducts([]);
        setError(err instanceof Error ? err.message : "Catalog request failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    if (loading || products === null) {
      return {
        ...buildStaticCatalog(),
        products: [],
        videos: [],
        hydrated: false,
        error: null,
        getProductsByType: () => [],
        getProductById: () => undefined,
        getProductBySlug: () => undefined,
        getVideoById: () => undefined,
        getVideoBySlug: () => undefined,
        getVideosByCharacter: () => [],
        getTrendingVideos: () => [],
        getRelatedVideos: () => [],
      };
    }

    const catalog = assembleStorefrontCatalogFromProducts(
      products,
      collections,
      characters,
      imagePdpSettings,
    );

    return {
      ...catalog,
      hydrated: true,
      error,
    };
  }, [loading, products, error, collections, characters, imagePdpSettings]);
}
