"use client";

import { useCatalog } from "@/catalog/useCatalog";
import { CatalogBuyColumn } from "@/components/products/CatalogBuyColumn";
import { CoverImage } from "@/components/ui/CoverImage";
import type { ProductType } from "@/catalog/productTypes";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import type { CatalogProduct } from "@/types";
import Link from "next/link";

export function ProductPageClient({
  slug,
  expectedType,
}: {
  slug: string;
  expectedType: ProductType;
}) {
  const catalog = useCatalog();
  const product = catalog.getProductBySlug(slug);
  const config = PRODUCT_TYPE_CONFIG[expectedType];

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!product || product.productType !== expectedType) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">
          {config.singular} not found
        </h1>
        <p className="mt-2 text-muted">
          This product may be draft or removed from the catalog.
        </p>
        <Link
          href={config.href}
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse {config.plural}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="mx-auto w-full max-w-sm lg:mx-0 lg:sticky lg:top-28 lg:self-start">
          <ProductHeroVisual product={product} />
        </div>
        <CatalogBuyColumn product={product} />
      </div>
    </div>
  );
}

function ProductHeroVisual({ product }: { product: CatalogProduct }) {
  const config = PRODUCT_TYPE_CONFIG[product.productType];

  if (product.productType === "AI_IMAGE") {
    return (
      <div className="space-y-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border">
          <CoverImage
            src={product.thumbnail || product.previewImages[0] || ""}
            alt=""
            fill
            className="object-cover"
            sizes="400px"
            priority
          />
        </div>
        {product.previewImages.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {product.previewImages.slice(0, 4).map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-border"
              >
                <CoverImage src={src} alt="" fill sizes="90px" />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (product.productType === "CAPTION_PACK" || product.productType === "PROMPT") {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-surface-2 ring-1 ring-border">
        {product.thumbnail ? (
          <CoverImage
            src={product.thumbnail}
            alt=""
            fill
            className="object-cover opacity-40 mix-blend-luminosity"
            sizes="400px"
            priority
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
            {config.singular}
          </p>
          <p className="mt-3 font-display text-2xl font-bold leading-snug text-white">
            {product.productType === "PROMPT"
              ? product.publicTeaser || product.title
              : product.previewItems?.[0]?.captionLead || product.title}
          </p>
          {product.productType === "CAPTION_PACK" ? (
            <p className="mt-4 text-sm text-white/75">
              {product.itemCount} caption + hashtag combos · sample preview
            </p>
          ) : null}
          {product.productType === "PROMPT" ? (
            <p className="mt-4 text-sm text-white/75">
              Full prompt unlocks after purchase
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (product.productType === "BUNDLE") {
    return (
      <div className="space-y-3">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border">
          <CoverImage
            src={product.thumbnail}
            alt=""
            fill
            className="object-cover"
            sizes="400px"
            priority
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {product.includedSummaries.length} products included
            </p>
            <p className="mt-1 font-display text-lg font-bold text-white">
              {product.title}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {product.includedSummaries.slice(0, 6).map((inc) => (
            <div
              key={inc.id}
              className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-border"
            >
              <CoverImage src={inc.thumbnail} alt="" fill sizes="120px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border">
      {product.thumbnail ? (
        <CoverImage
          src={product.thumbnail}
          alt=""
          fill
          className="object-cover"
          sizes="400px"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-surface-2 text-muted">
          {config.singular}
        </div>
      )}
    </div>
  );
}
