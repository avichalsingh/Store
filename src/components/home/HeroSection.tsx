"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { CoverImage } from "@/components/ui/CoverImage";
import { useCatalog } from "@/catalog/useCatalog";
import { DEFAULT_HOMEPAGE_HERO } from "@/catalog/homepageConfig";
import { publicPerformance } from "@/catalog/publicPerformance";
import { videos as staticVideos } from "@/data/videos";
import type { HomepageHeroConfig } from "@/admin/types";
import type { ProductPerformance, VideoProduct } from "@/types";
import { cn } from "@/lib/utils";

type CategoryAccent =
  | "viral-dance"
  | "ai-images"
  | "ai-tools"
  | "motion-control";

type LinkTile = {
  key: string;
  href: string;
  label: string;
  src?: string;
  className: string;
  /** Vibrant hero-category treatment for the four collage image cards. */
  accent?: CategoryAccent;
};

function takeDistinct(
  used: Set<string>,
  ...candidates: Array<string | undefined>
) {
  for (const src of candidates) {
    if (!src || used.has(src)) continue;
    used.add(src);
    return src;
  }
  return undefined;
}

/** Only real publishable metrics — respects KYC merchandising kill-switch. */
function isVerifiedPerformance(
  performance: ProductPerformance | null | undefined,
): performance is ProductPerformance {
  return Boolean(publicPerformance(performance));
}

function hasUsableThumbnail(video: VideoProduct | undefined): boolean {
  return Boolean(video?.thumbnail?.trim());
}

/**
 * When live catalog has no usable thumbs (or homepage is unpublished with
 * seed IDs missing from catalog), fall back to shipped static media assets.
 */
function resolveHeroVideoPool(
  live: VideoProduct[],
  fallback: VideoProduct[],
): VideoProduct[] {
  const liveWithMedia = live.filter(hasUsableThumbnail);
  if (liveWithMedia.length >= 3) return liveWithMedia;
  const seen = new Set(liveWithMedia.map((v) => v.id));
  const merged = [...liveWithMedia];
  for (const video of fallback) {
    if (!hasUsableThumbnail(video) || seen.has(video.id)) continue;
    seen.add(video.id);
    merged.push(video);
    if (merged.length >= 8) break;
  }
  return merged;
}

function trendingBadge(video: VideoProduct): string {
  const raw = video.performance?.badge?.trim() || "";
  if (/viral/i.test(raw)) return "VIRAL";
  if (/trend/i.test(raw)) return "TRENDING";
  if (video.isTrending) return "TRENDING";
  return "TRENDING";
}

function pickPreviewVideos(videos: VideoProduct[], count: number) {
  const withPreview = videos.filter((v) => Boolean(v.previewVideo));
  const trending = withPreview.filter((v) => v.isTrending);
  const rest = withPreview.filter((v) => !v.isTrending);
  const ordered = [...trending, ...rest];
  const picked: VideoProduct[] = [];
  const seen = new Set<string>();
  for (const video of ordered) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    picked.push(video);
    if (picked.length >= count) break;
  }
  return picked;
}

export function HeroSection({
  hero = DEFAULT_HOMEPAGE_HERO,
}: {
  hero?: HomepageHeroConfig;
}) {
  const { videos: liveVideos, getTrendingVideos, getProductsByType } =
    useCatalog();
  const collage = hero.collage ?? DEFAULT_HOMEPAGE_HERO.collage;

  const videos = useMemo(
    () => resolveHeroVideoPool(liveVideos, staticVideos),
    [liveVideos],
  );
  const trending = useMemo(() => {
    const liveTrending = getTrendingVideos(12);
    if (liveTrending.filter(hasUsableThumbnail).length >= 3) {
      return liveTrending.filter(hasUsableThumbnail);
    }
    return videos.filter((v) => v.isTrending).slice(0, 12);
  }, [getTrendingVideos, videos]);
  const videoPool = trending.length > 0 ? trending : videos;
  const images = getProductsByType("AI_IMAGE");

  const playable = useMemo(() => {
    const pool = videoPool.length ? videoPool : videos;
    const curated = collage.previewVideoIds
      .map((id) => videos.find((v) => v.id === id) ?? liveVideos.find((v) => v.id === id))
      .filter((v): v is VideoProduct => Boolean(v && hasUsableThumbnail(v)));
    if (curated.length === 0) {
      const withPreview = pickPreviewVideos(pool, 3);
      if (withPreview.length > 0) return withPreview;
      // No preview clips — still show thumbnail tiles from the pool.
      return pool.filter(hasUsableThumbnail).slice(0, 3);
    }
    const picked = [...curated];
    const seen = new Set(picked.map((v) => v.id));
    for (const video of [
      ...pickPreviewVideos(pool, 6),
      ...pool.filter(hasUsableThumbnail),
    ]) {
      if (picked.length >= 3) break;
      if (seen.has(video.id)) continue;
      seen.add(video.id);
      picked.push(video);
    }
    return picked.slice(0, 3);
  }, [videoPool, videos, liveVideos, collage.previewVideoIds]);

  const playableIds = useMemo(
    () => new Set(playable.map((v) => v.id)),
    [playable],
  );

  const featuredVideo = useMemo(() => {
    const curated = hero.featuredProductId
      ? liveVideos.find((v) => v.id === hero.featuredProductId) ??
        videos.find((v) => v.id === hero.featuredProductId)
      : undefined;
    if (curated?.thumbnail && !playableIds.has(curated.id)) {
      return curated;
    }
    const candidates = [
      ...videos.filter((v) => v.isFeatured),
      ...videoPool,
      ...videos,
    ];
    const unused = candidates.filter(
      (v) => !playableIds.has(v.id) && Boolean(v.thumbnail),
    );
    // Prefer remote catalog thumbnails over local seed placeholders.
    return (
      unused.find((v) => v.thumbnail.startsWith("http")) ||
      unused[0] ||
      curated ||
      playable[0]
    );
  }, [videos, liveVideos, videoPool, playableIds, playable, hero.featuredProductId]);

  const used = new Set<string>();
  for (const v of playable) {
    if (v.thumbnail) used.add(v.thumbnail);
  }
  if (featuredVideo?.thumbnail) used.add(featuredVideo.thumbnail);

  const curatedViral = collage.viralDanceProductId
    ? videos.find((v) => v.id === collage.viralDanceProductId)
    : undefined;
  const curatedMotion = collage.motionControlProductId
    ? videos.find((v) => v.id === collage.motionControlProductId)
    : undefined;
  const curatedImage = collage.aiImageProductId
    ? images.find((p) => p.id === collage.aiImageProductId)
    : undefined;

  const viralDanceSrc = curatedViral?.thumbnail
    ? (used.add(curatedViral.thumbnail), curatedViral.thumbnail)
    : takeDistinct(
        used,
        videoPool.find((v) => !playableIds.has(v.id))?.thumbnail,
        videos.find((v) => !playableIds.has(v.id) && v.id !== featuredVideo?.id)
          ?.thumbnail,
        images[0]?.thumbnail,
      );

  const motionControlSrc = curatedMotion?.thumbnail
    ? (used.add(curatedMotion.thumbnail), curatedMotion.thumbnail)
    : takeDistinct(
        used,
        videoPool.find((v) => v.thumbnail && !used.has(v.thumbnail))?.thumbnail,
        videos.find((v) => v.thumbnail && !used.has(v.thumbnail))?.thumbnail,
        images[1]?.thumbnail,
      );

  // Category still only — no Tools catalog /api dependency. collage.toolId ignored.
  const toolsSrc = takeDistinct(
    used,
    images[2]?.thumbnail,
    videos.find((v) => v.thumbnail && !used.has(v.thumbnail))?.thumbnail,
  );

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [isDesktopCollage, setIsDesktopCollage] = useState(false);
  const onActivate = useCallback((id: string | null) => {
    setActiveVideoId(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      setIsDesktopCollage(mq.matches);
      setActiveVideoId(null);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const aiImagesSrc = curatedImage?.thumbnail
    ? (used.add(curatedImage.thumbnail), curatedImage.thumbnail)
    : takeDistinct(
        used,
        images[0]?.thumbnail,
        images[1]?.thumbnail,
        images[2]?.thumbnail,
      );

  const linkTiles: {
    viralDance: LinkTile;
    aiImages: LinkTile;
    featured: LinkTile;
    motionControl: LinkTile;
    tools: LinkTile;
  } = {
    viralDance: {
      key: "viral-dance",
      href: "/videos",
      label: "Viral Dance Videos",
      src: viralDanceSrc,
      accent: "viral-dance",
      className: "aspect-[3/4] min-h-[160px] xl:min-h-[180px]",
    },
    aiImages: {
      key: "ai-images",
      href: "/images",
      label: "AI Images",
      src: aiImagesSrc,
      accent: "ai-images",
      className: "aspect-[4/3] min-h-[100px] xl:min-h-[110px]",
    },
    featured: {
      key: "featured-video",
      href: featuredVideo ? `/videos/${featuredVideo.slug}` : "/videos",
      label: "Featured Video",
      src: featuredVideo?.thumbnail,
      className: "aspect-[4/3] min-h-[100px] xl:min-h-[110px]",
    },
    motionControl: {
      key: "motion-control",
      href: "/videos",
      label: "Motion Control Videos",
      src: motionControlSrc,
      accent: "motion-control",
      className: "aspect-[3/4] min-h-[160px] xl:min-h-[180px]",
    },
    tools: {
      key: "ai-tools",
      href: "/explore",
      label: "Explore",
      src: toolsSrc,
      accent: "ai-tools",
      className: "aspect-[4/3] min-h-[100px] xl:min-h-[110px]",
    },
  };

  // Lower-left uses AI Images when available; otherwise Featured Video.
  const lowerLeftTile = linkTiles.aiImages.src
    ? linkTiles.aiImages
    : linkTiles.featured;

  type MobileCollageItem =
    | { kind: "link"; tile: LinkTile }
    | {
        kind: "video";
        video: VideoProduct | undefined;
        className: string;
        categoryLabel?: string;
      }
    | {
        kind: "center";
        video: VideoProduct | undefined;
        className: string;
      };

  const collageMobileItems: MobileCollageItem[] = [
    { kind: "link", tile: linkTiles.viralDance },
    {
      kind: "video",
      video: playable[0],
      className: "aspect-[9/16] min-h-[220px]",
      categoryLabel: "Reels-Ready",
    },
    {
      kind: "center",
      video: playable[1],
      className: "aspect-[3/4] min-h-[200px]",
    },
    {
      kind: "video",
      video: playable[2],
      className: "aspect-[9/16] min-h-[220px]",
    },
    { kind: "link", tile: lowerLeftTile },
    { kind: "link", tile: linkTiles.motionControl },
    { kind: "link", tile: linkTiles.tools },
  ];

  return (
    <section className="relative overflow-hidden bg-bg pb-12 pt-24 text-text sm:pb-16 sm:pt-28 lg:pt-[7.5rem]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mx-auto max-w-[22ch] text-center font-display text-balance text-[1.85rem] font-bold leading-[1.05] tracking-tight text-text sm:max-w-[20ch] sm:text-[2.35rem] lg:max-w-[22ch] lg:text-[2.65rem] xl:text-[3rem]"
        >
          {hero.headline || DEFAULT_HOMEPAGE_HERO.headline}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-5 sm:mt-6"
        >
          {/* Mobile / tablet rail — unmounted on desktop so only one player set loads */}
          {!isDesktopCollage ? (
            <div className="-mx-4 flex items-start gap-3 overflow-x-auto px-4 pb-4 hide-scrollbar">
              {collageMobileItems.map((item) => {
                if (item.kind === "link") {
                  return (
                    <CollageLinkTile
                      key={item.tile.key}
                      tile={item.tile}
                      className="w-[150px] shrink-0 sm:w-[180px]"
                    />
                  );
                }
                if (item.kind === "center") {
                  return (
                    <div
                      key={item.video?.id ?? "center-mobile"}
                      className="flex w-[150px] shrink-0 flex-col items-center gap-3 sm:w-[180px]"
                    >
                      {item.video ? (
                        <HeroCollageVideo
                          video={item.video}
                          activeId={activeVideoId}
                          onActivate={onActivate}
                          omitFooterLink
                          className={cn("w-full", item.className)}
                        />
                      ) : (
                        <CollageLinkTile
                          tile={{
                            ...lowerLeftTile,
                            key: "fallback-center-mobile",
                            className: cn("w-full", item.className),
                          }}
                        />
                      )}
                      <MarketplaceCta hero={hero} />
                    </div>
                  );
                }
                return item.video ? (
                  <HeroCollageVideo
                    key={item.video.id}
                    video={item.video}
                    activeId={activeVideoId}
                    onActivate={onActivate}
                    categoryLabel={item.categoryLabel}
                    className={cn(
                      "w-[150px] shrink-0 sm:w-[180px]",
                      item.className,
                    )}
                  />
                ) : null;
              })}
            </div>
          ) : (
            /* Shared bottom baseline via items-end: cols 1/2/4/5 + CTA align;
               centre video sits above that baseline with a gap, then the CTA. */
            <div className="grid grid-cols-5 items-end gap-3 pb-4 lg:gap-4">
              <div className="flex flex-col gap-3">
                <CollageLinkTile tile={linkTiles.viralDance} />
                <CollageLinkTile tile={lowerLeftTile} />
              </div>

              <div className="w-full">
                {playable[0] ? (
                  <HeroCollageVideo
                    video={playable[0]}
                    activeId={activeVideoId}
                    onActivate={onActivate}
                    hoverPlayback
                    categoryLabel="Reels-Ready"
                    className="aspect-[9/16] w-full"
                  />
                ) : (
                  <CollageLinkTile
                    tile={{
                      ...linkTiles.viralDance,
                      key: "fallback-left",
                      label: "Reels-Ready",
                      className: "aspect-[9/16] w-full",
                    }}
                  />
                )}
              </div>

              <div className="flex w-full flex-col items-center gap-3">
                {playable[1] ? (
                  <HeroCollageVideo
                    video={playable[1]}
                    activeId={activeVideoId}
                    onActivate={onActivate}
                    hoverPlayback
                    omitFooterLink
                    className="aspect-[3/4] w-full"
                  />
                ) : (
                  <CollageLinkTile
                    tile={{
                      ...lowerLeftTile,
                      key: "fallback-center",
                      className: "aspect-[3/4] w-full",
                    }}
                  />
                )}
                <MarketplaceCta hero={hero} />
              </div>

              <div className="w-full">
                {playable[2] ? (
                  <HeroCollageVideo
                    video={playable[2]}
                    activeId={activeVideoId}
                    onActivate={onActivate}
                    hoverPlayback
                    className="aspect-[9/16] w-full"
                  />
                ) : (
                  <CollageLinkTile
                    tile={{
                      ...linkTiles.motionControl,
                      key: "fallback-right",
                      className: "aspect-[9/16] w-full",
                    }}
                  />
                )}
              </div>

              <div className="flex flex-col gap-3">
                <CollageLinkTile tile={linkTiles.motionControl} />
                <CollageLinkTile tile={linkTiles.tools} />
              </div>
            </div>
          )}
        </motion.div>

      </div>
    </section>
  );
}

const CATEGORY_ACCENT_CLASS: Record<CategoryAccent, string> = {
  "viral-dance": "hero-category-card--viral",
  "ai-images": "hero-category-card--images",
  "ai-tools": "hero-category-card--tools",
  "motion-control": "hero-category-card--motion",
};

function CollageLinkTile({
  tile,
  className,
}: {
  tile: LinkTile;
  className?: string;
}) {
  const accent = tile.accent;

  return (
    <Link
      href={tile.href}
      aria-label={tile.label}
      className={cn(
        /* Outer wrapper = single source of radius + clip + border */
        "group relative block overflow-hidden rounded-[1.35rem] transition duration-300",
        accent
          ? "hero-category-card hover:-translate-y-1"
          : "border border-border bg-surface-2 shadow-sm hover:-translate-y-1.5 hover:scale-[1.02]",
        accent && CATEGORY_ACCENT_CLASS[accent],
        tile.className,
        className,
      )}
    >
      {/* Media shell: same radius/clip as outer — keeps blend/scale inside */}
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {tile.src ? (
          <CoverImage
            src={tile.src}
            alt=""
            fill
            className={cn(
              "object-cover transition duration-700",
              accent ? "group-hover:scale-[1.03]" : "group-hover:scale-[1.05]",
            )}
            sizes="220px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#ddd7cc] to-[#cfc7b8]" />
        )}
        {accent ? (
          <>
            <div
              aria-hidden
              className="hero-category-wash pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="hero-category-glow pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="hero-category-sheen pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="hero-category-scrim pointer-events-none absolute inset-0"
            />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        )}
      </div>
      <CollageLabel accent={accent}>{tile.label}</CollageLabel>
    </Link>
  );
}

function CollageLabel({
  children,
  accent,
}: {
  children: ReactNode;
  accent?: CategoryAccent;
}) {
  return (
    <span
      className={cn(
        "absolute bottom-3 left-3 z-20 max-w-[calc(100%-1.5rem)] rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white sm:text-xs",
        accent
          ? "hero-category-label backdrop-blur-md"
          : "bg-black/55 shadow-sm backdrop-blur-md",
      )}
    >
      {children}
    </span>
  );
}

/** Separate CTA under the center collage card — never overlaid on media. */
function MarketplaceCta({ hero }: { hero: HomepageHeroConfig }) {
  const href = hero.ctaHref?.trim() || DEFAULT_HOMEPAGE_HERO.ctaHref;
  const label = hero.ctaText?.trim() || DEFAULT_HOMEPAGE_HERO.ctaText;
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-text px-5 py-3 text-sm font-semibold text-bg shadow-lg transition hover:bg-accent hover:text-white"
    >
      {label}
      <ArrowUpRight size={15} />
    </Link>
  );
}

function HeroPerformanceOverlay({ video }: { video: VideoProduct }) {
  const performance = video.performance;
  const verified = isVerifiedPerformance(performance);
  // No placeholder dashes / “pending verification” — only real metrics.
  if (!verified) return null;

  const badge = trendingBadge(video);
  const metricLabel = performance.primaryLabel?.trim() || "PLAYS";
  const likes = performance.secondaryMetrics.find((m) =>
    /like/i.test(m.label),
  );
  const shares = performance.secondaryMetrics.find((m) =>
    /share/i.test(m.label),
  );
  const parts: string[] = [];
  if (likes?.value) parts.push(`${likes.value} likes`);
  if (shares?.value) parts.push(`${shares.value} shares`);
  const engagement = parts.length > 0 ? parts.join(" · ") : null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-11 pt-14 text-white">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
        {badge}
      </p>
      <p className="mt-1 font-display text-2xl font-bold leading-none tracking-tight sm:text-[1.75rem]">
        {performance.primaryMetric}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        {metricLabel}
      </p>
      {engagement ? (
        <p className="mt-1.5 text-[10px] font-medium tabular-nums text-white/85">
          {engagement}
        </p>
      ) : null}
    </div>
  );
}

function HeroCollageVideo({
  video,
  activeId,
  onActivate,
  className,
  categoryLabel,
  omitFooterLink,
  hoverPlayback = false,
}: {
  video: VideoProduct;
  activeId: string | null;
  onActivate: (id: string | null) => void;
  className?: string;
  categoryLabel?: string;
  /** Center featured card — CTA sits outside below the media. */
  omitFooterLink?: boolean;
  /** Desktop collage: muted autoplay on hover; mobile keeps tap play/pause. */
  hoverPlayback?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playing = activeId === video.id;
  const titleId = useId();

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !video.previewVideo) return;

    if (playing) {
      setLoading(true);
      setError(null);
      el.muted = true;
      void el
        .play()
        .then(() => {
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
          setError("Could not play preview");
          onActivate(null);
        });
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // Ignore seek errors while media is still loading.
      }
      setLoading(false);
    }
  }, [playing, video.previewVideo, onActivate]);

  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (!el) return;
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // Ignore seek errors during teardown.
      }
    };
  }, []);

  const startHoverPlayback = () => {
    if (!hoverPlayback || !video.previewVideo) return;
    onActivate(video.id);
  };

  const stopHoverPlayback = () => {
    if (!hoverPlayback) return;
    onActivate(null);
  };

  const toggle = (e: ReactMouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoverPlayback) return;
    if (!video.previewVideo) {
      setError("Preview not ready yet");
      return;
    }
    onActivate(playing ? null : video.id);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[1.35rem] border border-border bg-surface-2 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        className,
      )}
      onMouseEnter={hoverPlayback ? startHoverPlayback : undefined}
      onMouseLeave={hoverPlayback ? stopHoverPlayback : undefined}
    >
      <CoverImage
        src={video.thumbnail}
        alt=""
        fill
        className={cn(
          "object-cover transition duration-700",
          playing ? "opacity-0" : "opacity-100 group-hover:scale-[1.03]",
        )}
        sizes="220px"
      />

      {video.previewVideo ? (
        <video
          ref={videoRef}
          src={video.previewVideo}
          poster={video.thumbnail}
          muted
          loop
          playsInline
          preload="none"
          controls={false}
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onContextMenu={(e) => e.preventDefault()}
          onError={() => {
            setLoading(false);
            setError(null);
            if (playing) onActivate(null);
          }}
          className={cn(
            "absolute inset-0 z-[1] h-full w-full object-cover transition-opacity duration-300",
            playing ? "opacity-100" : "opacity-0",
          )}
        />
      ) : null}

      <HeroPerformanceOverlay video={video} />

      <button
        type="button"
        onClick={toggle}
        aria-labelledby={titleId}
        aria-pressed={playing}
        tabIndex={hoverPlayback ? -1 : undefined}
        className={cn(
          "absolute inset-0 z-20 flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-accent",
          hoverPlayback && "pointer-events-none",
        )}
      >
        <span className="sr-only" id={titleId}>
          {hoverPlayback
            ? `Preview of ${video.title}`
            : playing
              ? `Pause ${video.title}`
              : `Play ${video.title}`}
        </span>
        <span
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white shadow-lg backdrop-blur-md ring-1 ring-white/30 transition duration-300",
            playing
              ? "pointer-events-none scale-90 opacity-0"
              : "opacity-100 group-hover:scale-110 group-hover:bg-accent",
          )}
          aria-hidden={playing}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Play size={18} fill="currentColor" className="ml-0.5" />
          )}
        </span>
        {!hoverPlayback && playing ? (
          <span className="absolute rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white opacity-0 transition group-hover:opacity-100">
            Pause
          </span>
        ) : null}
      </button>

      {!omitFooterLink ? (
        <Link
          href={`/videos/${video.slug}`}
          className="absolute bottom-3 left-3 z-30 max-w-[calc(100%-1.5rem)] rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-white shadow-sm backdrop-blur-md transition hover:bg-accent sm:text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          {categoryLabel || video.title}
        </Link>
      ) : null}

      {error ? (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-30 rounded-lg bg-black/75 px-3 py-2 text-center text-[11px] font-medium text-white">
          {error}
        </div>
      ) : null}
    </div>
  );
}
