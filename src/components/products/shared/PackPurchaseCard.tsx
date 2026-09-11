"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import type { LaunchOffer, PriceQuote } from "@/types";
import { useRegion } from "@/context/RegionContext";
import { formatPrice } from "@/lib/pricing";
import { useCountdown } from "@/hooks/useCountdown";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { AnimatedClockUnit } from "@/components/motion/AnimatedDigit";
import { cn } from "@/lib/utils";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const OFFER_END_STORAGE_PREFIX = "rhythm-pack-offer-end-";

function isValidOfferEndDate(iso?: string): iso is string {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

function readOrCreateFallbackEnd(productId: string): string {
  const key = `${OFFER_END_STORAGE_PREFIX}${productId}`;
  const stored = localStorage.getItem(key);
  if (stored && isValidOfferEndDate(stored)) {
    return stored;
  }
  const end = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  localStorage.setItem(key, end);
  return end;
}

/**
 * Resolves countdown target: active CMS offer end date (via quote) takes
 * priority; otherwise a per-product 30-day deadline persisted in localStorage.
 */
function usePackCountdownEnd(quote: PriceQuote, productId?: string) {
  const [fallbackEnd, setFallbackEnd] = useState<string | undefined>();

  const cmsEnd =
    quote.saleActive && isValidOfferEndDate(quote.endDate)
      ? quote.endDate
      : undefined;

  useEffect(() => {
    if (cmsEnd) return;
    if (!productId || typeof window === "undefined") return;
    setFallbackEnd(readOrCreateFallbackEnd(productId));
  }, [cmsEnd, productId]);

  return cmsEnd ?? fallbackEnd;
}

function CountdownUnit({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-[3.1rem] flex-col items-center rounded-lg border border-accent/20 bg-accent/[0.04] px-2 py-1.5 tabular-nums sm:min-w-[3.4rem]">
      <span className="font-display text-xl font-bold tracking-wide text-text sm:text-2xl">
        <AnimatedClockUnit value={value} />
      </span>
      <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </span>
    </div>
  );
}

export function PackPurchaseCard({
  quote,
  offer: _offer,
  inCart,
  onBuyNow,
  onAddToCart,
  unlockHeading,
  ctaLabel,
  valueItems,
  headingId = "pack-unlock-heading",
  showTrending,
  showFeatured,
  productId,
}: {
  quote: PriceQuote;
  offer?: LaunchOffer;
  inCart: boolean;
  onBuyNow: () => void;
  onAddToCart: () => void;
  unlockHeading: string;
  ctaLabel: string;
  valueItems: readonly string[];
  headingId?: string;
  showTrending?: boolean;
  showFeatured?: boolean;
  productId?: string;
}) {
  const { region, ready } = useRegion();
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLElement>({ threshold: 0.25 });
  const countdownEnd = usePackCountdownEnd(quote, productId);
  const countdown = useCountdown(countdownEnd);
  const [ctaAttention, setCtaAttention] = useState(false);

  const saleLive = quote.saleActive;
  const savings = Math.max(0, quote.regular - quote.current);
  const showTimer = Boolean(countdownEnd) && countdown !== null;

  useEffect(() => {
    if (reduced || !inView) return;
    const id = window.setTimeout(() => setCtaAttention(true), 1600);
    return () => window.clearTimeout(id);
  }, [inView, reduced]);

  const badgeClass = cn(
    "rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-accent",
    !reduced && "pack-badge-alive",
  );

  return (
    <section
      ref={ref}
      aria-labelledby={headingId}
      className="offer-glow relative overflow-hidden rounded-2xl border border-accent/35 bg-surface p-6 shadow-[0_20px_50px_-24px_rgba(255,92,138,0.35)] sm:p-7"
    >
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
        {/* Compact urgency badges */}
        {(showTrending || showFeatured || (saleLive && savings > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {showTrending ? (
              <span className={badgeClass}>Trending</span>
            ) : null}
            {showFeatured ? (
              <span className={badgeClass}>Best value</span>
            ) : null}
            {saleLive && savings > 0 && ready ? (
              <span className={badgeClass}>
                Save {formatPrice(savings, region)}
              </span>
            ) : null}
          </div>
        )}

        <h2
          id={headingId}
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.16em] text-accent",
            showTrending || showFeatured || (saleLive && savings > 0)
              ? "mt-4"
              : "",
          )}
        >
          {unlockHeading}
        </h2>

        <div className="mt-3">
          {ready ? (
            <div className="relative inline-block">
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
          ) : (
            <div className="h-12 w-36 animate-pulse rounded-lg bg-surface-2" />
          )}
        </div>

        <p className="mt-3 text-sm text-muted">
          One-time purchase · Instant access
        </p>

        {showTimer ? (
          <div className="mt-5 rounded-xl border border-border/50 bg-surface-2/40 px-4 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Price goes up in
            </p>
            <div
              className="mt-2.5 flex flex-wrap items-end justify-center gap-1.5 sm:justify-start sm:gap-2"
              aria-live="polite"
              aria-atomic="true"
            >
              <CountdownUnit value={countdown.d} label="Days" />
              <span
                className="mb-4 font-display text-base font-bold text-muted/50"
                aria-hidden
              >
                :
              </span>
              <CountdownUnit value={countdown.h} label="Hrs" />
              <span
                className="mb-4 font-display text-base font-bold text-muted/50"
                aria-hidden
              >
                :
              </span>
              <CountdownUnit value={countdown.m} label="Min" />
              <span
                className="mb-4 font-display text-base font-bold text-muted/50"
                aria-hidden
              >
                :
              </span>
              <CountdownUnit value={countdown.s} label="Sec" />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onBuyNow}
            className={cn(
              "text-pack-cta group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent py-3.5 text-sm font-semibold uppercase tracking-[0.06em] text-white shadow-[0_10px_28px_-10px_rgba(255,92,138,0.55)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(255,92,138,0.72)] hover:brightness-110 active:translate-y-0 active:scale-[0.985]",
              !reduced && ctaAttention && "prompt-cta-attention",
              !reduced && "text-pack-cta-breathe",
              !reduced && saleLive && "text-pack-cta-active",
            )}
          >
            <span className="relative z-[1]">{ctaLabel}</span>
            <ArrowRight
              size={16}
              className="relative z-[1] transition-transform duration-300 group-hover:translate-x-1"
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

        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-border/50 pt-5 sm:justify-start">
          {valueItems.map((item) => (
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
      </div>
    </section>
  );
}
