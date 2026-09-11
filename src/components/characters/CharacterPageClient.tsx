"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
import { VideoCard } from "@/components/products/VideoCard";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCatalog } from "@/catalog/useCatalog";

export function CharacterPageClient({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const character = catalog.getCharacterBySlug(slug);

  if (!catalog.hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-80 animate-pulse rounded-[2rem] bg-surface-2" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-2xl font-bold">Character not found</h1>
      </div>
    );
  }

  const charVideos = catalog.getVideosByCharacter(character.id);
  const latest = [...charVideos].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const trending = charVideos.filter((v) => v.isTrending);
  const packs = catalog.collections.filter((c) =>
    c.videoIds.some((id) => charVideos.some((v) => v.id === id)),
  );

  return (
    <div>
      <section
        className="relative overflow-hidden pb-16 pt-28"
        style={
          {
            "--char-accent": character.accentColor,
          } as React.CSSProperties
        }
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background: `radial-gradient(ellipse at 20% 20%, ${character.accentColor}55, transparent 50%), radial-gradient(ellipse at 80% 0%, ${character.accentColor}22, transparent 40%)`,
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-end gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-[2rem] ring-1 ring-border">
            <CoverImage
              src={character.image}
              alt={character.name}
              fill
              priority
              sizes="400px"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, ${character.accentColor}99, transparent 50%)`,
              }}
            />
          </div>

          <div className="pb-2">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: character.accentColor }}
            >
              Character world
            </p>
            <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              {character.name}
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
              {character.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-2xl font-bold tabular-nums text-text">
                  {character.videoCount}
                </p>
                <p className="text-muted">Videos</p>
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums text-text">
                  {character.collectionCount}
                </p>
                <p className="text-muted">Collections</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="#all-videos"
                className="rounded-full px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: character.accentColor }}
              >
                Browse moves
              </Link>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-medium text-text-dim transition hover:border-accent/40 hover:text-text"
              >
                <Heart size={16} /> Favorite
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 pb-20 sm:px-6 lg:px-8">
        <section>
          <SectionHeader title="Latest Moves" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {latest.slice(0, 4).map((video) => (
              <VideoCard key={video.id} video={video} className="w-auto" />
            ))}
          </div>
        </section>

        {trending.length > 0 ? (
          <section>
            <SectionHeader title="Trending" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {trending.map((video) => (
                <VideoCard key={video.id} video={video} className="w-auto" />
              ))}
            </div>
          </section>
        ) : null}

        {packs.length > 0 ? (
          <section>
            <SectionHeader title="Dance Packs" />
            <div className="grid gap-5 md:grid-cols-2">
              {packs.map((pack) => (
                <CollectionCard key={pack.id} collection={pack} />
              ))}
            </div>
          </section>
        ) : null}

        <section id="all-videos">
          <SectionHeader title="All Videos" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {charVideos.map((video) => (
              <VideoCard key={video.id} video={video} className="w-auto" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
