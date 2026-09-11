"use client";

import { useMemo } from "react";
import { useCatalog } from "@/catalog/useCatalog";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";

export default function CaptionsBrowsePage() {
  const catalog = useCatalog();
  const config = PRODUCT_TYPE_CONFIG.CAPTION_PACK;

  const products = useMemo(
    () =>
      catalog
        .getProductsByType("CAPTION_PACK")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [catalog],
  );

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Shop
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
        {config.plural}
      </h1>
      <p className="mt-3 max-w-xl text-muted">{config.description}</p>

      {products.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl font-bold">No caption packs yet</p>
          <p className="mt-2 text-sm text-muted">
            Publish Caption Pack products in Admin CMS to list them here.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <CatalogProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
