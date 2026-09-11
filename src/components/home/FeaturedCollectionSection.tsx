"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { CoverImage } from "@/components/ui/CoverImage";
import { useRegion } from "@/context/RegionContext";
import { getCollectionQuote } from "@/lib/pricing";

export function FeaturedCollectionSection() {
  const { getFeaturedCollection } = useCatalog();
  const collection = getFeaturedCollection();
  const { region } = useRegion();
  if (!collection) return null;
  const quote = getCollectionQuote(collection, region);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-[2rem] bg-surface-2 ring-1 ring-border">
        <div className="absolute inset-0">
          <CoverImage
            src={collection.coverImage}
            alt=""
            fill
            className="opacity-40"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/30" />
        </div>

        <div className="relative grid gap-8 p-8 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:p-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Featured collection
            </p>
            <h2 className="mt-3 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl">
              {collection.title}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
              {collection.description}
            </p>
            {quote.saleActive && (
              <p className="mt-3 text-sm font-medium text-accent">
                {quote.label} · {quote.discountText}
              </p>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-6">
              <ProductPrice collection={collection} size="lg" />
              <span className="text-sm text-muted">
                {collection.videoIds.length} videos included
              </span>
            </div>
            <Link
              href={`/collections/${collection.slug}`}
              className="cta-soft relative mt-8 inline-flex overflow-hidden rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Unlock the full collection
            </Link>
          </div>

          <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-sm overflow-hidden rounded-[1.5rem] ring-1 ring-border lg:block">
            <CoverImage
              src={collection.coverImage}
              alt={collection.title}
              fill
              sizes="400px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                Bundle deal
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-white">
                Save more, dance more
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
