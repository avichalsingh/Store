"use client";

/**
 * 3D fan carousel — visual layout must stay identical to the pre–Stage 2
 * redesign. CMS may only supply copy + curated product ids (see props).
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { CoverImage } from "@/components/ui/CoverImage";
import { VideoPreview } from "@/components/products/VideoPreview";
import { PerformanceCardOverlay } from "@/components/products/PerformanceCardOverlay";
import { useCatalog } from "@/catalog/useCatalog";
import {
  DEFAULT_SECTION_COPY,
  resolveCuratedById,
  sectionMaxItems,
} from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";
import { publicPerformance } from "@/catalog/publicPerformance";
import type { VideoProduct } from "@/types";
import { cn } from "@/lib/utils";

const TRENDING_CARD_COUNT = 7;

function pickTrendingCarousel(
  trendingPool: VideoProduct[],
  allVideos: VideoProduct[],
  count: number,
) {
  const picked: VideoProduct[] = [];
  const seen = new Set<string>();

  for (const video of trendingPool) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    picked.push(video);
    if (picked.length >= count) return picked;
  }

  for (const video of allVideos) {
    if (seen.has(video.id) || !video.thumbnail) continue;
    seen.add(video.id);
    picked.push(video);
    if (picked.length >= count) break;
  }

  return picked;
}

export function TrendingSection({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { getTrendingVideos, videos } = useCatalog();
  const maxItems = sectionMaxItems(
    { id: "trending", label: "", enabled: true, order: 0, content },
    "trending",
    TRENDING_CARD_COUNT,
  );
  const fallback = pickTrendingCarousel(
    getTrendingVideos(maxItems + 4),
    videos,
    maxItems,
  );
  const trending = resolveCuratedById(
    videos,
    content?.productIds,
    fallback,
    maxItems,
  );
  const [index, setIndex] = useState(0);
  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY.trending.eyebrow || "";
  const title =
    copy?.title?.trim() || DEFAULT_SECTION_COPY.trending.title || "";
  const description =
    copy?.description?.trim() ||
    DEFAULT_SECTION_COPY.trending.description ||
    "";

  const windowItems = useMemo(() => {
    if (trending.length === 0) return [];
    // Show one slot per distinct product (up to 7) so cards never duplicate.
    const visible = Math.min(TRENDING_CARD_COUNT, trending.length);
    const half = Math.floor(visible / 2);
    const offsets = Array.from({ length: visible }, (_, i) => i - half);
    return offsets.map((offset) => {
      const i = (index + offset + trending.length * 10) % trending.length;
      return { video: trending[i]!, offset };
    });
  }, [trending, index]);

  if (trending.length === 0) return null;

  return (
    <section className="overflow-hidden bg-bg py-12 sm:py-14">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        {eyebrow ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mx-auto mt-3 max-w-xl text-base text-muted">
            {description}
          </p>
        ) : null}
      </div>

      {/*
        Stage height must fit width-driven 9:16 cards:
        mobile 198×352, sm 234×416, lg 252×448 — plus room for rotateY.
      */}
      <div
        className="relative mx-auto mt-8 flex h-[380px] max-w-5xl items-center justify-center sm:mt-10 sm:h-[470px] lg:h-[520px]"
        style={{ perspective: "1200px" }}
      >
        {windowItems.map(({ video, offset }) => {
          const abs = Math.abs(offset);
          const scale =
            offset === 0
              ? 1
              : abs === 1
                ? 0.86
                : abs === 2
                  ? 0.72
                  : 0.6;
          const rotate = offset * -9;
          const x = offset * 102;
          const opacity =
            offset === 0
              ? 1
              : abs === 1
                ? 0.72
                : abs === 2
                  ? 0.4
                  : 0.26;
          const z = 40 - abs * 10;
          const isActive = offset === 0;
          const performance = publicPerformance(video.performance);
          const showMetrics = Boolean(
            video.showCardMetrics && performance,
          );

          return (
            <div
              key={`${video.id}-${offset}`}
              className={cn(
                /* Width-driven 9:16 on OUTER border-box. overflow:hidden stays
                   on the inner media shell so hover never clips the border. */
                "absolute w-[198px] aspect-[9/16] rounded-[1.5rem] border bg-surface-2 shadow-2xl shadow-black/40 transition-[transform,opacity,border-color] duration-500 ease-out sm:w-[234px] lg:w-[252px]",
                isActive ? "border-accent/55" : "border-border",
              )}
              style={{
                transform: `translateX(${x}px) scale(${scale}) rotateY(${rotate}deg)`,
                opacity,
                zIndex: z,
                transformStyle: "preserve-3d",
              }}
            >
              <div
                className="absolute inset-0 overflow-hidden rounded-[inherit]"
                onClick={(e) => {
                  if (!isActive) {
                    e.preventDefault();
                    setIndex(
                      (i) => (i + offset + trending.length) % trending.length,
                    );
                  }
                }}
                role={!isActive ? "button" : undefined}
                tabIndex={!isActive ? 0 : undefined}
                onKeyDown={(e) => {
                  if (
                    !isActive &&
                    (e.key === "Enter" || e.key === " ")
                  ) {
                    e.preventDefault();
                    setIndex(
                      (i) => (i + offset + trending.length) % trending.length,
                    );
                  }
                }}
                aria-label={
                  isActive
                    ? undefined
                    : `Show ${video.title} in trending carousel`
                }
              >
                {isActive ? (
                  <VideoPreview
                    key={`active-${video.id}-${index}`}
                    thumbnail={video.thumbnail}
                    title={video.title}
                    previewVideo={video.previewVideo}
                    priority
                    autoPlayOnHover
                    className="absolute inset-0 aspect-auto h-full w-full rounded-none"
                  />
                ) : (
                  <CoverImage
                    src={video.thumbnail}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 252px, (min-width: 640px) 234px, 198px"
                  />
                )}

                {!isActive ? (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                ) : null}

                {isActive && showMetrics && performance ? (
                  <PerformanceCardOverlay
                    performance={performance}
                    variant="card"
                    className="pb-16"
                  />
                ) : null}

                {isActive ? (
                  <Link
                    href={`/videos/${video.slug}`}
                    className="absolute inset-x-0 bottom-0 z-30 block p-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="truncate font-display text-lg font-bold text-white drop-shadow">
                      {video.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-white/70">
                      {video.characterName}
                    </p>
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-1.5 py-1.5">
          <button
            type="button"
            aria-label="Previous trending video"
            onClick={() =>
              setIndex((i) => (i - 1 + trending.length) % trending.length)
            }
            className="flex h-9 w-9 items-center justify-center rounded-full text-text transition hover:bg-surface-2 hover:text-accent"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="h-4 w-px bg-border" aria-hidden />
          <button
            type="button"
            aria-label="Next trending video"
            onClick={() => setIndex((i) => (i + 1) % trending.length)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-text transition hover:bg-surface-2 hover:text-accent"
          >
            <ArrowRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {trending.map((v, i) => (
            <button
              key={v.id}
              type="button"
              aria-label={`Go to trending video ${i + 1}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-6 bg-text" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>
        <Link
          href="/explore?sort=trending"
          className="text-sm font-medium text-text-dim transition hover:text-accent"
        >
          See all trending AI dance videos →
        </Link>
      </div>
    </section>
  );
}
