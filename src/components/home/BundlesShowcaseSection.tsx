"use client";

import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { useCatalog } from "@/catalog/useCatalog";
import {
  DEFAULT_SECTION_COPY,
  resolveFeaturedSelection,
  sectionMaxItems,
} from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";
import type { BundleProductPublic } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Asymmetric BrewBolt-style bento:
 * top: featured ~2/3 + companion ~1/3
 * bottom: three equal cards
 */
const BUNDLE_SLOT_CLASS = [
  "min-h-[280px] sm:col-span-2 sm:min-h-[300px] lg:col-span-2 lg:row-start-1 lg:min-h-0",
  "min-h-[240px] sm:min-h-[300px] lg:col-start-3 lg:row-start-1 lg:min-h-0",
  "min-h-[220px] lg:col-start-1 lg:row-start-2 lg:min-h-0",
  "min-h-[220px] lg:col-start-2 lg:row-start-2 lg:min-h-0",
  "min-h-[220px] lg:col-start-3 lg:row-start-2 lg:min-h-0",
] as const;

export function BundlesShowcaseSection({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { getProductsByType } = useCatalog();
  const allBundles = getProductsByType("BUNDLE").filter(
    (p): p is BundleProductPublic => p.productType === "BUNDLE",
  );
  const maxItems = sectionMaxItems(
    { id: "bundles", label: "", enabled: true, order: 0, content },
    "bundles",
    5,
  );
  const bundles = resolveFeaturedSelection(
    allBundles,
    content?.productIds,
    allBundles,
    maxItems,
  );

  if (bundles.length === 0) return null;

  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY.bundles.eyebrow || "";
  const title = copy?.title?.trim() || DEFAULT_SECTION_COPY.bundles.title || "";
  const description =
    copy?.description?.trim() || DEFAULT_SECTION_COPY.bundles.description || "";
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY.bundles.ctaLabel ||
    "Browse all bundles";
  const ctaHref =
    copy?.ctaHref?.trim() || DEFAULT_SECTION_COPY.bundles.ctaHref || "/bundles";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
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
            <p className="mt-2 text-base text-muted sm:mt-3">{description}</p>
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
          "grid grid-cols-1 gap-4 sm:grid-cols-2",
          "lg:grid-cols-3 lg:grid-rows-[minmax(320px,1.2fr)_minmax(250px,1fr)]",
          "lg:h-[min(68vh,660px)]",
        )}
      >
        {bundles.map((bundle, index) => (
          <BundleBentoCard key={bundle.id} bundle={bundle} slot={index} />
        ))}
      </div>
    </section>
  );
}

function BundleBentoCard({
  bundle,
  slot,
}: {
  bundle: BundleProductPublic;
  slot: number;
}) {
  const isFeatured = slot === 0;
  const showDescription = slot <= 1;
  const assetCount =
    bundle.includedSummaries?.length || bundle.includedProductIds?.length || 0;

  return (
    <Link
      href={`/bundles/${bundle.slug}`}
      className={cn(
        "group relative isolate overflow-hidden rounded-[1.5rem] border border-border bg-surface-2",
        "transition-[border-color] duration-300 hover:border-accent/40",
        BUNDLE_SLOT_CLASS[slot] ?? "min-h-[220px]",
      )}
    >
      {/* Media shell keeps hover scale clipped to the rounded card */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {bundle.thumbnail ? (
          <CoverImage
            src={bundle.thumbnail}
            alt=""
            fill
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            sizes={
              isFeatured
                ? "(max-width: 1024px) 100vw, 66vw"
                : "(max-width: 1024px) 50vw, 33vw"
            }
          />
        ) : null}
      </div>

      {/* Readable default scrim — fades away on hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/40 to-black/10 opacity-100 transition-opacity duration-[350ms] ease-out group-hover:opacity-0"
      />

      <span className="absolute left-3 top-3 z-[2] inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
        <Package size={11} />
        Bundle
      </span>

      <span className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition group-hover:brightness-110">
        <ArrowUpRight size={15} />
      </span>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[2] p-4 sm:p-5",
          isFeatured && "sm:p-6",
        )}
      >
        <h3
          className={cn(
            "font-display font-bold tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]",
            isFeatured ? "text-2xl sm:text-3xl lg:text-[2rem]" : "text-lg sm:text-xl",
          )}
        >
          {bundle.title}
        </h3>
        {showDescription && bundle.description ? (
          <p
            className={cn(
              "mt-1.5 text-sm leading-relaxed text-white/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]",
              isFeatured ? "line-clamp-2 max-w-xl" : "line-clamp-2",
            )}
          >
            {bundle.description}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            {assetCount > 0 ? (
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
                {assetCount} included asset{assetCount === 1 ? "" : "s"}
              </p>
            ) : null}
            <div className="mt-1 text-white [&_*]:text-white">
              <ProductPrice product={bundle} size="sm" />
            </div>
          </div>
          <span className="text-xs font-semibold text-accent">View Bundle</span>
        </div>
      </div>
    </Link>
  );
}
