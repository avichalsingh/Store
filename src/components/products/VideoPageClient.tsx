"use client";

import { useCatalog } from "@/catalog/useCatalog";
import { VideoCard } from "@/components/products/VideoCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProductHeroMedia } from "@/components/products/ProductHeroMedia";
import { ProductBuyColumn } from "@/components/products/ProductBuyColumn";
import { StickyPurchaseBar } from "@/components/products/StickyPurchaseBar";
import { SoftPdpConfetti } from "@/components/products/pdp/SoftPdpConfetti";

export function VideoPageClient({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const video = catalog.getVideoBySlug(slug);

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Video not found</h1>
        <p className="mt-2 text-muted">
          This product may be draft or removed from the catalog.
        </p>
      </div>
    );
  }

  const character = catalog.getCharacterById(video.characterId ?? "");
  const fromCharacter = catalog
    .getRelatedVideos(video, 4)
    .filter((v) => v.characterId === video.characterId);
  const alsoLike = catalog.videos
    .filter((v) => v.id !== video.id && v.category === video.category)
    .slice(0, 4);
  const relatedFallback = catalog.getRelatedVideos(video, 4);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-28 pt-28 sm:px-6 lg:px-8">
      <SoftPdpConfetti />

      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:gap-12">
        <div
          className="w-full lg:sticky lg:top-24 lg:self-start"
          style={{ ["--pdp-chrome" as string]: "12.5rem" }}
        >
          <div className="pdp-video-fit">
            <ProductHeroMedia video={video} />
          </div>
        </div>
        <ProductBuyColumn video={video} />
      </div>

      <div className="mt-20 space-y-16">
        <section>
          <SectionHeader
            title="More from this character"
            href={character ? `/characters/${character.slug}` : undefined}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(fromCharacter.length ? fromCharacter : relatedFallback).map(
              (v) => (
                <VideoCard key={v.id} video={v} className="w-auto" />
              ),
            )}
          </div>
        </section>

        <section>
          <SectionHeader title="You may also like" href="/explore" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {(alsoLike.length ? alsoLike : relatedFallback).map((v) => (
              <VideoCard key={v.id} video={v} className="w-auto" />
            ))}
          </div>
        </section>
      </div>

      <StickyPurchaseBar video={video} targetId="product-buy" />
    </div>
  );
}
