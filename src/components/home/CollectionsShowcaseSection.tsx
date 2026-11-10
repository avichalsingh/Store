"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
import { useCatalog } from "@/catalog/useCatalog";
import {
  DEFAULT_SECTION_COPY,
  resolveCuratedById,
  sectionMaxItems,
} from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";
import type { Collection } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Distinct editorial 12-column layout (not the bundles bento):
 * featured left = 6 cols × 2 rows; supporting 2×2 on the right (3 cols each).
 */
const COLLECTION_SLOT_CLASS = [
  "min-h-[320px] sm:col-span-2 lg:col-span-6 lg:row-span-2 lg:min-h-0",
  "min-h-[220px] lg:col-span-3 lg:col-start-7 lg:row-start-1 lg:min-h-0",
  "min-h-[220px] lg:col-span-3 lg:col-start-10 lg:row-start-1 lg:min-h-0",
  "min-h-[220px] lg:col-span-3 lg:col-start-7 lg:row-start-2 lg:min-h-0",
  "min-h-[220px] lg:col-span-3 lg:col-start-10 lg:row-start-2 lg:min-h-0",
] as const;

export function CollectionsShowcaseSection({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { collections } = useCatalog();
  const maxItems = sectionMaxItems(
    { id: "collections", label: "", enabled: true, order: 0, content },
    "collections",
    5,
  );
  const fallback = [...collections].sort(
    (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)),
  );
  const list = resolveCuratedById(
    collections,
    content?.collectionIds,
    fallback,
    maxItems,
  );

  if (list.length === 0) return null;

  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY.collections.eyebrow || "";
  const title =
    copy?.title?.trim() || DEFAULT_SECTION_COPY.collections.title || "";
  const description =
    copy?.description?.trim() ||
    DEFAULT_SECTION_COPY.collections.description ||
    "";
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY.collections.ctaLabel ||
    "View all collections";
  const ctaHref =
    copy?.ctaHref?.trim() ||
    DEFAULT_SECTION_COPY.collections.ctaHref ||
    "/collections";

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
          "lg:grid-cols-12 lg:grid-rows-2",
          "lg:h-[min(70vh,680px)]",
        )}
      >
        {list.map((collection, index) => (
          <CollectionEditorialCard
            key={collection.id}
            collection={collection}
            slot={index}
          />
        ))}
      </div>
    </section>
  );
}

function CollectionEditorialCard({
  collection,
  slot,
}: {
  collection: Collection;
  slot: number;
}) {
  const isFeatured = slot === 0;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={cn(
        "group relative isolate overflow-hidden rounded-[1.5rem] border border-border bg-surface-2",
        "transition-[border-color] duration-300 hover:border-accent/40",
        COLLECTION_SLOT_CLASS[slot] ?? "min-h-[220px]",
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {collection.coverImage ? (
          <CoverImage
            src={collection.coverImage}
            alt=""
            fill
            className={cn(
              "object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
              isFeatured ? "object-[center_30%]" : "object-center",
            )}
            sizes={
              isFeatured
                ? "(max-width: 1024px) 100vw, 50vw"
                : "(max-width: 1024px) 50vw, 25vw"
            }
          />
        ) : null}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/85 via-black/40 to-black/10 opacity-100 transition-opacity duration-[350ms] ease-out group-hover:opacity-0"
      />

      {collection.featured ? (
        <span className="absolute left-3 top-3 z-[2] rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
          Featured
        </span>
      ) : null}

      <span className="absolute right-3 top-3 z-[2] flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition group-hover:border-accent group-hover:bg-accent">
        <ArrowUpRight size={15} />
      </span>

      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-[2] p-4 sm:p-5",
          isFeatured && "sm:p-7",
        )}
      >
        <h3
          className={cn(
            "font-display font-bold tracking-tight text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]",
            isFeatured
              ? "text-3xl sm:text-4xl lg:text-[2.35rem]"
              : "text-lg sm:text-xl",
          )}
        >
          {collection.title}
        </h3>
        {collection.description ? (
          <p
            className={cn(
              "mt-2 text-sm leading-relaxed text-white/80 drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]",
              isFeatured ? "line-clamp-3 max-w-lg sm:text-base" : "line-clamp-2",
            )}
          >
            {collection.description}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-white/70">
          {collection.videoIds.length} AI dance video
          {collection.videoIds.length === 1 ? "" : "s"} · Explore Collection
        </p>
      </div>
    </Link>
  );
}
