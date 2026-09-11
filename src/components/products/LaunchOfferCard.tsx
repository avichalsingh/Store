"use client";

import { motion } from "framer-motion";
import type { LaunchOffer, PriceQuote } from "@/types";
import { useCountdown } from "@/hooks/useCountdown";
import { useRegion } from "@/context/RegionContext";
import { formatPrice } from "@/lib/pricing";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { AnimatedClockUnit } from "@/components/motion/AnimatedDigit";
import { cn } from "@/lib/utils";

export function LaunchOfferCard({
  quote,
  offer,
  showCta = false,
  onBuy,
}: {
  quote: PriceQuote;
  offer?: LaunchOffer;
  showCta?: boolean;
  onBuy?: () => void;
}) {
  const countdown = useCountdown(quote.saleActive ? quote.endDate : undefined);
  const { region, ready } = useRegion();
  const { ref, inView } = useInViewOnce<HTMLDivElement>();
  const reduced = usePrefersReducedMotion();
  const reveal = inView || reduced;
  const savings = Math.max(0, quote.regular - quote.current);

  return (
    <div
      ref={ref}
      className={cn(
        "offer-glow relative overflow-hidden rounded-[1.5rem] border border-accent/35 bg-surface p-5 sm:p-6",
      )}
    >
      {quote.saleActive ? (
        <>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-accent animate-save-badge">
            ⚡ LAUNCH PRICE ACTIVE
          </p>

          {ready ? (
            <div className="mt-4">
              <p className="text-sm text-muted line-through tabular-nums">
                {formatPrice(quote.regular, region)}
              </p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                GET IT TODAY
              </p>
              <div className="relative mt-1 inline-block min-h-[2.75rem]">
                {reveal && !reduced ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-xl animate-price-glow" />
                ) : null}
                <motion.p
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={
                    reveal ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }
                  }
                  transition={{
                    duration: reduced ? 0 : 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="relative font-display text-4xl font-bold tabular-nums text-text sm:text-5xl"
                >
                  {formatPrice(quote.current, region)}
                </motion.p>
              </div>
            </div>
          ) : (
            <div className="mt-4 h-16 w-40 animate-pulse rounded bg-surface-2" />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {ready && savings > 0 ? (
              <motion.span
                initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={
                  reveal
                    ? { opacity: 1, scale: 1 }
                    : { opacity: 0, scale: 0.85 }
                }
                transition={{
                  type: "spring",
                  stiffness: 380,
                  damping: 18,
                  delay: reduced ? 0 : 0.15,
                }}
                className="inline-flex rounded-full bg-accent px-3 py-1 text-xs font-bold text-white"
              >
                SAVE {formatPrice(savings, region)}
              </motion.span>
            ) : null}
            <span
              className={cn(
                "relative inline-flex overflow-hidden rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent",
                !reduced && "badge-shimmer",
              )}
            >
              {quote.discountText || offer?.discountText || "11% OFF"}
            </span>
          </div>

          {countdown && !countdown.expired ? (
            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                <span className="animate-hourglass inline-block">⏳</span> THIS
                PRICE ENDS IN
              </p>
              <p
                className="mt-2 flex items-center gap-1 font-display text-3xl font-bold tracking-wide text-text"
                aria-live="polite"
                aria-atomic="true"
              >
                {countdown.mode === "with-days" ? (
                  <>
                    <AnimatedClockUnit value={countdown.d} />
                    <span className="text-muted">:</span>
                    <AnimatedClockUnit value={countdown.h} />
                    <span className="text-muted">:</span>
                    <AnimatedClockUnit value={countdown.m} />
                    <span className="text-muted">:</span>
                    <AnimatedClockUnit value={countdown.s} />
                  </>
                ) : (
                  <>
                    <AnimatedClockUnit value={countdown.h} />
                    <span className="text-muted">:</span>
                    <AnimatedClockUnit value={countdown.m} />
                    <span className="text-muted">:</span>
                    <AnimatedClockUnit value={countdown.s} />
                  </>
                )}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted">
                {countdown.mode === "with-days"
                  ? "DAYS   HRS   MINS   SECS"
                  : "HRS   MINS   SECS"}
              </p>
              <p className="mt-3 text-sm text-muted">
                Price automatically increases after the countdown ends.
              </p>
            </div>
          ) : null}

          {showCta && onBuy ? (
            <div className="mt-5 space-y-2">
              <div className="relative">
                {!reduced ? (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-2xl cta-heartbeat-glow" />
                ) : null}
                <button
                  type="button"
                  onClick={onBuy}
                  className="cta-heartbeat relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.985]"
                >
                  <span className="animate-lightning" aria-hidden>
                    ⚡
                  </span>
                  GET THIS TREND NOW
                </button>
              </div>
              <p className="text-center text-xs text-muted">
                Instant access after purchase
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            Current price
          </p>
          <p className="mt-2 font-display text-4xl font-bold tabular-nums text-text sm:text-5xl">
            {ready ? formatPrice(quote.current, region) : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
