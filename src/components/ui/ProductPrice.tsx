"use client";

import { useRegion } from "@/context/RegionContext";
import {
  getCatalogProductQuote,
  getCollectionQuote,
  getVideoQuote,
} from "@/lib/pricing";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import type { CatalogProduct, Collection, VideoProduct } from "@/types";

export function ProductPrice({
  video,
  collection,
  product,
  size = "md",
  className,
}: {
  video?: VideoProduct;
  collection?: Collection;
  product?: CatalogProduct;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const { region } = useRegion();
  const quote = product
    ? getCatalogProductQuote(product, region)
    : video
      ? getVideoQuote(video, region)
      : collection
        ? getCollectionQuote(collection, region)
        : null;
  if (!quote) return null;
  return (
    <PriceDisplay
      price={quote.current}
      originalPrice={quote.saleActive ? quote.regular : undefined}
      size={size}
      className={className}
    />
  );
}
