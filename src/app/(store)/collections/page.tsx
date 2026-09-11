"use client";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { TrendingStrip } from "@/components/home/TrendingStrip";
import { useCatalog } from "@/catalog/useCatalog";

export default function CollectionsPage() {
  const { collections } = useCatalog();

  return (
    <>
      <div className="pt-20">
        <TrendingStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Packs
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Collections
          </h1>
          <p className="mt-3 text-muted">
            Curated packs with bundle pricing — more moves, better value.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {collections.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      </div>
    </>
  );
}
