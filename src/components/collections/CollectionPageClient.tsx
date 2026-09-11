"use client";

import { CoverImage } from "@/components/ui/CoverImage";
import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { CollectionValueStack } from "@/components/collections/CollectionValueStack";
import { CollectionBuyColumn } from "@/components/collections/CollectionBuyColumn";
import { ViralPerformanceCard } from "@/components/products/ViralPerformanceCard";

export function CollectionPageClient({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const collection = catalog.getCollectionBySlug(slug);

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-[2rem] bg-surface-2" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Collection not found</h1>
      </div>
    );
  }

  const included = collection.videoIds
    .map((id) => catalog.getVideoById(id))
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <div className="relative aspect-[16/11] overflow-hidden rounded-[2rem] ring-1 ring-border">
          <CoverImage
            src={collection.coverImage}
            alt={collection.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 60vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
          {collection.performance ? (
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                {collection.performance.badge}
              </p>
              <p className="font-display text-4xl font-bold text-white">
                {collection.performance.primaryMetric}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-white/70">
                {collection.performance.primaryLabel}
              </p>
            </div>
          ) : null}
        </div>

        <CollectionBuyColumn
          collection={collection}
          videoCount={included.length}
        />
      </div>

      <div className="mt-12">
        <CollectionValueStack collection={collection} />
      </div>

      {collection.performance ? (
        <div className="mt-10">
          <ViralPerformanceCard performance={collection.performance} />
        </div>
      ) : null}

      <section className="mt-16">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Included videos
        </h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {included.map((video) =>
            video ? (
              <Link
                key={video.id}
                href={`/videos/${video.slug}`}
                className="group"
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-2xl ring-1 ring-border transition group-hover:ring-accent/40">
                  <div className="absolute inset-0 origin-center transition-transform duration-500 ease-out group-hover:scale-[1.06]">
                    <CoverImage
                      src={video.thumbnail}
                      alt=""
                      fill
                      sizes="180px"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-white/70">
                      {video.characterName}
                    </p>
                    <p className="truncate text-sm font-semibold text-white">
                      {video.title}
                    </p>
                  </div>
                </div>
              </Link>
            ) : null,
          )}
        </div>
      </section>
    </div>
  );
}
