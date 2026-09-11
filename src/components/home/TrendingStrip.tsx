"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import { trendingStripItems } from "@/data/conversion";

export function TrendingStrip() {
  const { videos } = useCatalog();
  const items = trendingStripItems
    .map((item) => {
      const video = videos.find((v) => v.id === item.videoId);
      if (!video) return null;
      return { ...item, slug: video.slug };
    })
    .filter(Boolean) as Array<{
    id: string;
    label: string;
    metric: string;
    slug: string;
  }>;

  const loop = [...items, ...items];

  return (
    <section
      aria-label="Trending right now"
      className="relative overflow-hidden border-y border-border bg-surface/80"
    >
      <div className="pointer-events-none absolute inset-0 animate-ambient-glow bg-[linear-gradient(90deg,transparent,rgba(255,92,138,0.08),transparent)]" />
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 overflow-hidden px-4 py-3.5 sm:px-6 lg:px-8">
        <p className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          Trending right now
        </p>
        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div className="flex w-max animate-[marquee_36s_linear_infinite] gap-8 pr-8 hover:[animation-play-state:paused]">
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={`/videos/${item.slug}`}
                className="flex shrink-0 items-center gap-2 rounded-full border border-transparent px-2 py-1 text-sm text-text-dim transition hover:border-accent/30 hover:bg-accent/10 hover:text-accent"
              >
                <span className="font-semibold text-text">{item.label}</span>
                <span className="text-muted">—</span>
                <span className="font-medium">{item.metric}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
