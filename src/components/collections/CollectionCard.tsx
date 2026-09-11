"use client";

import Link from "next/link";
import type { Collection } from "@/types";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { CoverImage } from "@/components/ui/CoverImage";
import { useRegion } from "@/context/RegionContext";
import { getCollectionQuote } from "@/lib/pricing";
import { cn } from "@/lib/utils";

type CollectionCardProps = {
  collection: Collection;
  className?: string;
};

export function CollectionCard({ collection, className }: CollectionCardProps) {
  const { region } = useRegion();
  const quote = getCollectionQuote(collection, region);
  const savings = quote.discountPct;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className={cn(
        "group relative block rounded-3xl bg-surface ring-1 ring-border transition hover:-translate-y-1 hover:ring-accent/30",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-t-3xl">
        <div className="absolute inset-0 origin-center transition-transform duration-700 ease-out group-hover:scale-[1.06]">
          <CoverImage
            src={collection.coverImage}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/20 to-transparent" />
        {savings > 0 && (
          <span className="absolute left-4 top-4 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-white animate-save-badge">
            Save {savings}%
          </span>
        )}
      </div>
      <div className="space-y-2 p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
          {collection.videoIds.length} videos
        </p>
        <h3 className="font-display text-xl font-bold text-text transition group-hover:text-accent">
          {collection.title}
        </h3>
        <p className="line-clamp-2 text-sm text-muted">{collection.description}</p>
        {collection.socialProofText && (
          <p className="text-xs text-accent">{collection.socialProofText}</p>
        )}
        <ProductPrice collection={collection} className="pt-1" />
      </div>
    </Link>
  );
}
