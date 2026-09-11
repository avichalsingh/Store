"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { CoverImage } from "@/components/ui/CoverImage";
import { useRegion } from "@/context/RegionContext";
import { formatPrice, getCollectionQuote } from "@/lib/pricing";

export function CollectionValueSection() {
  const { getFeaturedCollection } = useCatalog();
  const collection = getFeaturedCollection();
  const { region, ready } = useRegion();
  if (!collection) return null;

  const quote = getCollectionQuote(collection, region);
  const savings = quote.regular - quote.current;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid overflow-hidden rounded-[2rem] border border-border bg-surface lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative min-h-[280px] lg:min-h-full">
          <CoverImage
            src={collection.coverImage}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent lg:bg-gradient-to-r" />
        </div>
        <div className="relative p-8 sm:p-10 lg:p-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Best value
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Stop buying one video at a time.
          </h2>
          <p className="mt-3 text-muted">
            Get the complete {collection.title.toLowerCase()} and build multiple
            posts from one unlock.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-text-dim">
            <li>✓ {collection.videoIds.length} ready-to-use dance videos</li>
            <li>
              ✓ {collection.exclusiveCount ?? 2} exclusive character variations
            </li>
            <li>
              ✓ {collection.unreleasedCount ?? 1} unreleased format variations
            </li>
            <li>✓ Vertical 9:16 · Instant access</li>
          </ul>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                If bought individually
              </p>
              <p className="text-lg text-muted line-through tabular-nums">
                {ready ? formatPrice(quote.regular, region) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                Your collection price
              </p>
              <p className="font-display text-4xl font-bold tabular-nums text-text">
                {ready ? formatPrice(quote.current, region) : "—"}
              </p>
            </div>
            {quote.discountPct > 0 && (
              <span className="animate-save-badge rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">
                SAVE {quote.discountPct}% ·{" "}
                {ready ? formatPrice(savings, region) : ""}
              </span>
            )}
          </div>

          <Link
            href={`/collections/${collection.slug}`}
            className="cta-soft relative mt-8 inline-flex overflow-hidden rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            ⚡ Unlock the Full Collection →
          </Link>
          <p className="mt-3 text-xs text-muted">
            Get everything now for less than buying individually.
          </p>
        </div>
      </div>
    </section>
  );
}
