"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
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

export function PromptsDiscoverySection({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { getProductsByType } = useCatalog();
  const allPrompts = getProductsByType("PROMPT");
  const maxItems = sectionMaxItems(
    { id: "prompts", label: "", enabled: true, order: 0, content },
    "prompts",
    5,
  );
  const prompts = resolveFeaturedSelection(
    allPrompts,
    content?.productIds,
    allPrompts,
    maxItems,
  );
  const featured = prompts[0];
  const rest = prompts.slice(1, 5);

  if (prompts.length === 0) return null;

  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY.prompts.eyebrow || "";
  const title = copy?.title?.trim() || DEFAULT_SECTION_COPY.prompts.title || "";
  const description =
    copy?.description?.trim() || DEFAULT_SECTION_COPY.prompts.description || "";
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY.prompts.ctaLabel ||
    "Browse all prompts";
  const ctaHref =
    copy?.ctaHref?.trim() || DEFAULT_SECTION_COPY.prompts.ctaHref || "/prompts";

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

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {featured ? (
          <Link
            href={`/prompts/${featured.slug}`}
            className="group relative min-h-[280px] overflow-hidden rounded-[1.75rem] border border-border bg-[#16122a] sm:min-h-[340px]"
          >
            {featured.thumbnail ? (
              <CoverImage
                src={featured.thumbnail}
                alt=""
                fill
                className="object-cover opacity-45 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-55"
                sizes="640px"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#2d2450] via-[#1e1a2e] to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute left-5 top-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-bg">
                <Sparkles size={12} />
                Prompt
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-7">
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-bold text-white sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mt-2 max-w-md text-sm text-white/70 line-clamp-2">
                  {featured.productType === "PROMPT"
                    ? featured.publicTeaser || featured.description
                    : featured.description}
                </p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
                <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        ) : null}

        <div
          className={cn(
            "-mx-4 flex overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0",
            PRODUCT_CARD_GRID_GAP,
          )}
        >
          {rest.map((product) => (
            <CatalogProductCard
              key={product.id}
              product={product}
              className="w-[220px] shrink-0 sm:w-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
