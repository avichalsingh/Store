"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";
import { CaptionHeroVisual } from "@/components/products/caption-pdp/CaptionHeroVisual";
import { CaptionBuyColumn } from "@/components/products/caption-pdp/CaptionBuyColumn";
import { isCaptionPackProduct } from "@/components/products/caption-pdp/captionPackView";

export function CaptionPageClient({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const product = catalog.getProductBySlug(slug);
  const config = PRODUCT_TYPE_CONFIG.CAPTION_PACK;

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!product || !isCaptionPackProduct(product)) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Caption pack not found</h1>
        <p className="mt-2 text-muted">
          This product may be draft or removed from the catalog.
        </p>
        <Link
          href={config.href}
          className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Browse caption packs
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-12 xl:gap-16">
        <div className="mx-auto w-full max-w-sm lg:mx-0 lg:sticky lg:top-28 lg:self-start">
          <CaptionHeroVisual product={product} />
        </div>
        <CaptionBuyColumn product={product} catalogProduct={product} />
      </div>
    </div>
  );
}
