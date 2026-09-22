import { createClient } from "@supabase/supabase-js";
import {
  mapCatalogViewsToProducts,
  type CatalogProductRow,
  type CatalogRelationshipRow,
} from "@/catalog/mapSupabaseProduct";
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
 * Public storefront catalog.
 * Reads only `catalog_products` + `catalog_product_relationships` (never raw `products`).
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
          error: productsResult.error.message,
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
          error: relationshipsResult.error.message,
        } satisfies CatalogApiResponse,
        { status: 502 },
      );
    }

    const products = mapCatalogViewsToProducts(
      (productsResult.data ?? []) as CatalogProductRow[],
      (relationshipsResult.data ?? []) as CatalogRelationshipRow[],
    );

    return NextResponse.json({
      products,
    } satisfies CatalogApiResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog fetch failed";
    console.error("[api/catalog]", message);
    return NextResponse.json(
      { products: [], error: message } satisfies CatalogApiResponse,
      { status: 500 },
    );
  }
}
