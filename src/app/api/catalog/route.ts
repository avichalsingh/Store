import { createClient } from "@supabase/supabase-js";
import {
  mapCatalogViewsToProducts,
  type CatalogMediaPublicRow,
  type CatalogProductRow,
  type CatalogRelationshipRow,
} from "@/catalog/mapSupabaseProduct";
import { sanitizePublicMediaUrl } from "@/lib/security/publicMedia";
import { createServiceClient } from "@/lib/supabase/admin";
import type { CatalogProduct } from "@/types";
import { NextResponse } from "next/server";

/** Short CDN/edge cache after catalog mapping proved correct. */
export const revalidate = 60;

export type CatalogApiResponse = {
  products: CatalogProduct[];
  error?: string;
};

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Load public preview/thumbnail fields for referenced media assets.
 * Uses service role server-side only; never selects master_path/bucket.
 */
async function loadPublicMediaRows(
  mediaAssetIds: string[],
): Promise<CatalogMediaPublicRow[]> {
  const ids = [...new Set(mediaAssetIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) return [];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) return [];

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("media_assets")
      .select("id, preview_url, thumbnail_url, preview_playback, updated_at")
      .in("id", ids);
    if (error) {
      console.error("[api/catalog] media_assets public fields:", error.message);
      return [];
    }
    return ((data ?? []) as CatalogMediaPublicRow[]).map((row) => ({
      ...row,
      preview_url: sanitizePublicMediaUrl(row.preview_url) ?? null,
      thumbnail_url: sanitizePublicMediaUrl(row.thumbnail_url) ?? null,
    }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "media_assets load failed";
    console.error("[api/catalog] media_assets public fields:", message);
    return [];
  }
}

/** Final pass: never ship master Storage URLs on the public catalog API. */
function hardenPublicProducts(products: CatalogProduct[]): CatalogProduct[] {
  return products.map((p) => {
    const thumbnail = sanitizePublicMediaUrl(p.thumbnail) ?? "";
    const previewVideo = sanitizePublicMediaUrl(
      "previewVideo" in p ? (p as { previewVideo?: string }).previewVideo : undefined,
    );
    if ("previewVideo" in p) {
      return {
        ...p,
        thumbnail,
        previewVideo,
      } as CatalogProduct;
    }
    return { ...p, thumbnail };
  });
}

/**
 * Public storefront catalog.
 * Reads `catalog_products` + relationships, and enriches customer preview
 * URLs from media_assets public fields (never private masters).
 */
export async function GET() {
  try {
    const supabase = getPublicClient();

    const [productsResult, relationshipsResult] = await Promise.all([
      supabase.from("catalog_products").select("*"),
      supabase.from("catalog_product_relationships").select("*"),
    ]);

    if (productsResult.error) {
      console.error(
        "[api/catalog] catalog_products error:",
        productsResult.error.message,
      );
      return NextResponse.json(
        {
          products: [],
          error: "Catalog temporarily unavailable",
        } satisfies CatalogApiResponse,
        { status: 502 },
      );
    }

    if (relationshipsResult.error) {
      console.error(
        "[api/catalog] catalog_product_relationships error:",
        relationshipsResult.error.message,
      );
      return NextResponse.json(
        {
          products: [],
          error: "Catalog temporarily unavailable",
        } satisfies CatalogApiResponse,
        { status: 502 },
      );
    }

    const productRows = ((productsResult.data ?? []) as CatalogProductRow[]).map(
      (row) => {
        const media =
          row.media && typeof row.media === "object"
            ? (row.media as Record<string, unknown>)
            : {};
        return {
          ...row,
          media: {
            thumbnail:
              sanitizePublicMediaUrl(
                typeof media.thumbnail === "string" ? media.thumbnail : undefined,
              ) ?? "",
            previewVideo: sanitizePublicMediaUrl(
              typeof media.previewVideo === "string"
                ? media.previewVideo
                : undefined,
            ),
          },
        };
      },
    );
    const mediaAssetIds = productRows
      .map((p) => p.media_asset_id)
      .filter((id): id is string => Boolean(id?.trim()));
    const mediaRows = await loadPublicMediaRows(mediaAssetIds);

    const products = hardenPublicProducts(
      mapCatalogViewsToProducts(
        productRows,
        (relationshipsResult.data ?? []) as CatalogRelationshipRow[],
        mediaRows,
      ),
    );

    return NextResponse.json({
      products,
    } satisfies CatalogApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog fetch failed";
    console.error("[api/catalog]", message);
    return NextResponse.json(
      {
        products: [],
        error: "Catalog temporarily unavailable",
      } satisfies CatalogApiResponse,
      { status: 500 },
    );
  }
}
