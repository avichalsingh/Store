"use client";

import { useRouter } from "next/navigation";
import type { VideoProduct } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCart } from "@/context/CartContext";
import { getVideoQuote, formatPrice } from "@/lib/pricing";
import { TrendCta } from "@/components/ui/TrendCta";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";

export function MidPageFomo({ video }: { video: VideoProduct }) {
  const { region, ready } = useRegion();
  const quote = getVideoQuote(video, region);
  const { addVideo, items } = useCart();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  if (!video.performance) return null;

  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-[#0a0a0c] px-6 py-14 text-white ring-1 ring-white/10 sm:px-10 sm:py-16">
      <div
        className={
          reduced
            ? "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(255,92,138,0.22),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(124,108,255,0.14),transparent_40%)]"
            : "pointer-events-none absolute inset-0 animate-ambient-glow bg-[radial-gradient(circle_at_10%_20%,rgba(255,92,138,0.26),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(124,108,255,0.16),transparent_40%)]"
        }
      />
      {!reduced && (
        <>
          <span className="pointer-events-none absolute left-[18%] top-[24%] h-1.5 w-1.5 rounded-full bg-accent/80 animate-particle-a" />
          <span className="pointer-events-none absolute right-[14%] top-[36%] h-1 w-1 rounded-full bg-white/50 animate-particle-b" />
          <span className="pointer-events-none absolute bottom-[22%] left-[55%] h-1 w-1 rounded-full bg-accent-2/80 animate-particle-c" />
          <span className="pointer-events-none absolute left-[72%] bottom-[38%] h-1 w-1 rounded-full bg-accent/60 animate-particle-a" />
          <span className="pointer-events-none absolute left-[30%] bottom-[28%] h-0.5 w-0.5 rounded-full bg-white/40 animate-particle-b" />
        </>
      )}

      <div className="relative max-w-3xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">
          The trend is moving.
        </p>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Don&apos;t be the last to use it.
        </h2>
        <p className="mt-4 max-w-xl text-base text-white/70">
          By the time a format is everywhere, it&apos;s usually already late.
          Get the content while it still feels fresh.
        </p>
        <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold">
          <span>
            🔥 {video.performance.primaryMetric}{" "}
            {video.performance.primaryLabel.toLowerCase()}
          </span>
          {video.performance.secondaryMetrics[1] && (
            <span>
              ↗ {video.performance.secondaryMetrics[1].value}{" "}
              {video.performance.secondaryMetrics[1].label.toLowerCase()}
            </span>
          )}
          <span>⭐ High creator interest</span>
        </div>
        {quote.saleActive && ready && (
          <p className="mt-6 font-display text-3xl font-bold">
            {formatPrice(quote.current, region)}{" "}
            <span className="text-lg font-medium text-white/45 line-through">
              {formatPrice(quote.regular, region)}
            </span>
            <span className="ml-3 text-base text-accent">
              {quote.discountText}
            </span>
          </p>
        )}
        <div className="mt-8 max-w-xs">
          <TrendCta
            variant="soft"
            microcopy={false}
            onClick={() => {
              if (!items.some((i) => i.productId === video.id)) {
                addVideo(video, { open: false });
              }
              router.push("/checkout");
            }}
          >
            Get this trend now →
          </TrendCta>
        </div>
      </div>
    </section>
  );
}
