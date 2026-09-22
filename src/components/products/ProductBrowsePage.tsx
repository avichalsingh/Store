"use client";

import { useCatalog } from "@/catalog/useCatalog";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import {
  PRODUCT_TYPE_CONFIG,
  type ProductType,
} from "@/catalog/productTypes";

export function ProductBrowsePage({ type }: { type: ProductType }) {
  const catalog = useCatalog();
  const config = PRODUCT_TYPE_CONFIG[type];
  const products = catalog.getProductsByType(type);

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (catalog.error) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Shop
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {config.plural}
        </h1>
        <div className="mt-12 rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl font-bold">Catalog unavailable</p>
          <p className="mt-2 text-sm text-muted">
            We couldn&apos;t load products right now. Please try again shortly.
          </p>
        </div>
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
          <p className="font-display text-xl font-bold">
            No {config.plural.toLowerCase()} yet
          </p>
          <p className="mt-2 text-sm text-muted">
            No products of this type are available yet.
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
