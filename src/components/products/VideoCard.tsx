"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ProductPrice } from "@/components/ui/ProductPrice";
import { AddToCartButton } from "@/components/ui/AddToCartButton";
import { VideoPreview } from "@/components/products/VideoPreview";
import { PerformanceCardOverlay } from "@/components/products/PerformanceCardOverlay";
import { TrendingBadgeLabel } from "@/components/motion/TrendingBadgeLabel";
import type { VideoProduct } from "@/types";
import { cn } from "@/lib/utils";

type VideoCardProps = {
  video: VideoProduct;
  className?: string;
  priority?: boolean;
  showProof?: boolean;
};

export function VideoCard({
  video,
  className,
  priority,
  showProof = true,
}: VideoCardProps) {
  const showMetrics = showProof && video.showCardMetrics && video.performance;

  return (
    <article
      className={cn(
        "group relative flex w-[160px] shrink-0 flex-col transition duration-300 ease-out hover:-translate-y-1 hover:scale-[1.01] sm:w-[180px] lg:w-auto",
        className
      )}
    >
      <Link
        href={`/videos/${video.slug}`}
        aria-label={`${video.title} by ${video.characterName}`}
        className="relative block overflow-hidden rounded-2xl ring-1 ring-border transition duration-300 hover:ring-accent/45 hover:shadow-[0_10px_32px_rgba(255,92,138,0.12)]"
      >
        <VideoPreview
          thumbnail={video.thumbnail}
          title={video.title}
          previewVideo={video.previewVideo}
          priority={priority}
        />

        <div className="absolute left-2.5 top-2.5 z-10 flex max-w-[85%] flex-wrap gap-1.5">
          {video.performance ? (
            <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/15 backdrop-blur-md">
              <TrendingBadgeLabel badge={video.performance.badge} />
            </span>
          ) : (
            <>
              {video.isTrending && <Badge>Trending</Badge>}
              {video.isNew && <Badge tone="neutral">New</Badge>}
            </>
          )}
        </div>

        {showMetrics && video.performance && (
          <PerformanceCardOverlay
            performance={video.performance}
            variant="card"
          />
        )}

        <div
          className={cn(
            "absolute z-20 opacity-0 transition duration-300 group-hover:opacity-100",
            showMetrics ? "right-2.5 top-2.5" : "bottom-2.5 right-2.5"
          )}
        >
          <AddToCartButton video={video} variant="icon" />
        </div>
      </Link>

      <div className="mt-3 space-y-1 px-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
          {video.characterName}
        </p>
        <Link href={`/videos/${video.slug}`}>
          <h3 className="truncate text-sm font-semibold text-text transition hover:text-accent">
            {video.title}
          </h3>
        </Link>
        <div className="flex items-center justify-between gap-2">
          <ProductPrice video={video} size="sm" />
          <span className="truncate text-[11px] text-muted">{video.category}</span>
        </div>
      </div>
    </article>
  );
}
