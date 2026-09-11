"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import type { LaunchOffer, PriceQuote } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { formatPrice } from "@/lib/pricing";
import { useCountdown } from "@/hooks/useCountdown";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { AnimatedClockUnit } from "@/components/motion/AnimatedDigit";
import { cn } from "@/lib/utils";

const VALUE_ITEMS = [
  "Full structured prompt",
  "Instant access",
  "Yours forever",
] as const;

export function PromptPurchaseCard({
  quote,
  offer,
  inCart,
  onBuyNow,
  onAddToCart,
}: {
  quote: PriceQuote;
  offer?: LaunchOffer;
  inCart: boolean;
  onBuyNow: () => void;
  onAddToCart: () => void;
}) {
  const { region, ready } = useRegion();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLElement>({ threshold: 0.25 });
  const countdown = useCountdown(quote.saleActive ? quote.endDate : undefined);
  const [ctaAttention, setCtaAttention] = useState(false);

  const saleLive = quote.saleActive;
  const discountLabel =
    quote.discountPct > 0
      ? `${quote.discountPct}% OFF`
      : offer?.discountText?.trim() || null;
  const offerLabel =
    quote.label?.trim() ||
    offer?.label?.trim() ||
    "LIMITED LAUNCH PRICE";

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setTimeout(() => setCtaAttention(true), 1600);
    return () => window.clearTimeout(id);
  }, [inView, reduced]);

  return (
    <section
      ref={ref}
      aria-labelledby="prompt-unlock-heading"
      className={cn(
        "offer-glow relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-5 sm:p-6",
      )}
    >
      {/* Slow ambient breathe — supports price, never dominates */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-12 -top-14 h-44 w-44 rounded-full bg-accent/25 blur-3xl",
          !reduced && "prompt-purchase-glow",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-16 -left-10 h-36 w-36 rounded-full bg-accent/15 blur-3xl",
          !reduced && "prompt-purchase-glow-delayed",
        )}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {saleLive ? (
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full bg-accent",
                  !reduced && "animate-live-dot",
                )}
                aria-hidden
              />
              {offerLabel}
            </p>
          ) : (
            <h2
              id="prompt-unlock-heading"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-accent"
            >
              Unlock the full prompt
            </h2>
          )}

          {saleLive && discountLabel ? (
            <motion.span
              initial={reduced ? false : { opacity: 0, y: -4, scale: 0.94 }}
              animate={
                inView || reduced
                  ? { opacity: 1, y: 0, scale: 1 }
                  : { opacity: 0, y: -4, scale: 0.94 }
              }
              transition={{
                duration: reduced ? 0 : 0.45,
                ease: [0.22, 1, 0.36, 1],
                delay: reduced ? 0 : 0.12,
              }}
              className="inline-flex rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent"
            >
              {discountLabel}
            </motion.span>
          ) : null}
        </div>

        {saleLive ? (
          <h2 id="prompt-unlock-heading" className="sr-only">
            Unlock the full prompt
          </h2>
        ) : null}

        <div className="mt-4">
          {ready ? (
            <>
              {saleLive ? (
                <p className="text-sm text-muted line-through tabular-nums">
                  {formatPrice(quote.regular, region)}
                </p>
              ) : null}
              <div className="relative mt-0.5 inline-block">
                {!reduced && saleLive ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/20 blur-xl"
                  />
                ) : null}
                <p className="relative font-display text-4xl font-bold tabular-nums tracking-tight text-text sm:text-[2.75rem]">
                  {formatPrice(quote.current, region)}
                </p>
              </div>
            </>
          ) : (
            <div className="h-12 w-36 animate-pulse rounded-lg bg-surface-2" />
          )}
        </div>

        <p className="mt-2 text-sm text-muted">
          One-time purchase · Instant access
        </p>

        {saleLive && countdown && !countdown.expired ? (
          <div className="mt-5 border-y border-border/70 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Launch price ends in
            </p>
            <div
              className="mt-3 flex items-end justify-center gap-2 sm:justify-start sm:gap-2.5"
              aria-live="polite"
              aria-atomic="true"
            >
              {(countdown.mode === "with-days"
                ? [
                    { value: countdown.d, label: "Days" },
                    { value: countdown.h, label: "Hrs" },
                    { value: countdown.m, label: "Min" },
                    { value: countdown.s, label: "Sec" },
                  ]
                : [
                    { value: countdown.h, label: "Hrs" },
                    { value: countdown.m, label: "Min" },
                    { value: countdown.s, label: "Sec" },
                  ]
              ).map((unit, index, list) => (
                <div key={unit.label} className="flex items-end gap-2 sm:gap-2.5">
                  <div className="flex min-w-[2.75rem] flex-col items-center rounded-lg border border-accent/20 bg-accent/[0.05] px-2 py-1.5 tabular-nums sm:min-w-[3.1rem]">
                    <span className="font-display text-xl font-bold tracking-wide text-text sm:text-2xl">
                      <AnimatedClockUnit value={unit.value} />
                    </span>
                    <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {unit.label}
                    </span>
                  </div>
                  {index < list.length - 1 ? (
                    <span
                      className="mb-5 font-display text-lg font-bold text-muted/70"
                      aria-hidden
                    >
                      :
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onBuyNow}
            className={cn(
              "group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(255,92,138,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,92,138,0.72)] hover:brightness-110 active:translate-y-0 active:scale-[0.985]",
              !reduced && ctaAttention && "prompt-cta-attention",
            )}
          >
            Unlock this prompt
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
          <button
            type="button"
            disabled={inCart}
            onClick={onAddToCart}
            className="w-full rounded-full border border-border py-3 text-sm font-medium text-text transition hover:border-accent/40 disabled:opacity-50"
          >
            {inCart ? "In cart" : "Add to cart"}
          </button>
        </div>

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start">
          {VALUE_ITEMS.map((item) => (
            <li
              key={item}
              className="inline-flex items-center gap-1.5 text-[12px] text-muted"
            >
              <Check
                size={13}
                strokeWidth={2.4}
                className="shrink-0 text-accent"
                aria-hidden
              />
              {item}
            </li>
          ))}
        </ul>

        {saleLive ? (
          <p className="mt-4 inline-flex items-center gap-2 text-[12px] text-muted">
            <span
              className={cn(
                "relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-accent",
                !reduced && "animate-live-dot",
              )}
              aria-hidden
            />
            Offer active now
          </p>
        ) : null}
      </div>
    </section>
  );
}
