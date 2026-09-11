"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { VideoCard } from "@/components/products/VideoCard";
import { useCatalog } from "@/catalog/useCatalog";

export function TrendingSection() {
  const { getTrendingVideos } = useCatalog();
  const trending = getTrendingVideos(10);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SectionHeader
        eyebrow="Fresh heat"
        title="Trending Now"
        description="The dances creators are looping, remixing, and turning into content right now."
        href="/explore?sort=trending"
        linkLabel="See all trending"
      />
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-2 hide-scrollbar sm:-mx-0 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
        {trending.map((video, i) => (
          <VideoCard
            key={video.id}
            video={video}
            priority={i < 2}
            className="sm:w-auto"
          />
        ))}
      </div>
    </section>
  );
}
