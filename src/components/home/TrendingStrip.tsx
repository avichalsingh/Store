"use client";

import Link from "next/link";
import { useCatalog } from "@/catalog/useCatalog";
import {
  DEFAULT_SECTION_COPY,
  resolveTickerEntries,
} from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

export function TrendingStrip({
  copy,
  content,
}: HomepageSectionViewProps = {}) {
  const { videos } = useCatalog();
  const reducedMotion = usePrefersReducedMotion();

  // No seed metric fallback. Ticker metrics are never verified analytics —
  // strip them on the public storefront so demo play/% counts cannot render.
  const items = resolveTickerEntries(content?.tickerEntries, videos, {
    allowSeedFallback: false,
  }).map((item) => ({ ...item, metric: "" }));

  if (items.length === 0) return null;

  const loop = reducedMotion ? items : [...items, ...items];
  const eyebrow =
    copy?.eyebrow?.trim() ||
    DEFAULT_SECTION_COPY["trending-strip"].eyebrow ||
    "Trending right now";

  return (
    <section
      aria-label={eyebrow}
      className="relative z-[1] px-4 py-4 sm:px-6 lg:px-8"
    >
      <div
        className={cn(
          "mx-auto flex max-w-5xl items-center gap-3 overflow-hidden",
          "rounded-[1.35rem] border border-border bg-surface/90 px-4 py-3 sm:gap-4 sm:px-5 sm:py-3.5",
          "backdrop-blur-md",
        )}
      >
        <p className="inline-flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full bg-accent/70",
                !reducedMotion && "animate-ping",
              )}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          {eyebrow}
        </p>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          <div
            className={cn(
              "trending-strip-marquee flex w-max gap-8 pr-8",
              !reducedMotion && "hover:[animation-play-state:paused]",
              reducedMotion && "flex-wrap",
            )}
          >
            {loop.map((item, i) => (
              <Link
                key={`${item.id}-${i}`}
                href={item.href}
                className="flex shrink-0 items-center gap-2 px-1 py-1 text-sm text-text-dim transition hover:text-accent"
              >
                <span className="font-semibold text-text">{item.label}</span>
                {item.metric ? (
                  <>
                    <span className="text-muted">—</span>
                    <span className="font-medium">{item.metric}</span>
                  </>
                ) : null}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
