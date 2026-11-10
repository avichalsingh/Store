"use client";

import Link from "next/link";
import { CatalogProductCard } from "@/components/products/CatalogProductCard";
import { PRODUCT_CARD_GRID_GAP } from "@/components/products/productCardGrid";
import { useCatalog } from "@/catalog/useCatalog";
import {
  DEFAULT_SECTION_COPY,
  resolveFeaturedSelection,
  sectionMaxItems,
} from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";
import { cn } from "@/lib/utils";

export function ImagesShowcaseSection({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { getProductsByType } = useCatalog();
  const allImages = getProductsByType("AI_IMAGE");
  const maxItems = sectionMaxItems(
    { id: "images", label: "", enabled: true, order: 0, content },
    "images",
    8,
  );
  const images = resolveFeaturedSelection(
    allImages,
    content?.productIds,
    allImages,
    maxItems,
  );

  if (images.length === 0) return null;

  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY.images.eyebrow || "";
  const title = copy?.title?.trim() || DEFAULT_SECTION_COPY.images.title || "";
  const description =
    copy?.description?.trim() || DEFAULT_SECTION_COPY.images.description || "";
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY.images.ctaLabel ||
    "Browse AI images";
  const ctaHref =
    copy?.ctaHref?.trim() || DEFAULT_SECTION_COPY.images.ctaHref || "/images";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? (
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-base text-muted">{description}</p>
          ) : null}
        </div>
        <Link
          href={ctaHref}
          className="shrink-0 text-sm font-medium text-text-dim transition hover:text-accent"
        >
          {ctaLabel} →
        </Link>
      </div>
      <div
        className={cn(
          "-mx-4 flex overflow-x-auto px-4 pb-4 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 md:grid-cols-4",
          PRODUCT_CARD_GRID_GAP,
        )}
      >
        {images.map((product) => (
          <CatalogProductCard
            key={product.id}
            product={product}
            className="w-[220px] shrink-0 sm:w-auto"
          />
        ))}
      </div>
    </section>
  );
}
