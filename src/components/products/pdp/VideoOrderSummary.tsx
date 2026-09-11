"use client";

import { AnimatePresence, motion } from "framer-motion";
import { formatPrice } from "@/lib/pricing";
import type { Region } from "@/types";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

export type SummaryLine = {
  id: string;
  label: string;
  amount: number;
};

export function VideoOrderSummary({
  lines,
  total,
  region,
  ready,
  onBuy,
  savingsAmount = 0,
  regularPrice,
  className,
}: {
  lines: SummaryLine[];
  total: number;
  region: Region;
  ready: boolean;
  onBuy: () => void;
  savingsAmount?: number;
  regularPrice?: number;
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInViewOnce<HTMLElement>({ threshold: 0.25 });
  const reveal = inView || reduced;

  return (
    <section
      id="product-buy"
      ref={ref}
      className={cn(
        "space-y-5 rounded-2xl border border-border bg-surface p-5 sm:p-6",
        className,
      )}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          YOUR TREND IS READY
        </p>
        <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          You’re one step away from posting it.
        </h2>
      </div>

      <div className="space-y-2.5 text-sm">
        {lines.map((line) => (
          <div
            key={line.id}
            className="flex items-center justify-between gap-3 text-muted"
          >
            <span className="truncate">{line.label}</span>
            <span className="shrink-0 tabular-nums text-text">
              {ready ? formatPrice(line.amount, region) : "—"}
            </span>
          </div>
        ))}
      </div>

      {ready && savingsAmount > 0 ? (
        <div
          className={cn(
            "relative overflow-hidden rounded-xl border border-accent/25 bg-accent/[0.06] px-4 py-3",
            reveal && !reduced && "animate-savings-sweep",
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            YOUR SAVINGS TODAY
          </p>
          <motion.p
            initial={reduced ? false : { opacity: 0, scale: 0.9 }}
            animate={
              reveal ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }
            }
            transition={{ type: "spring", stiffness: 360, damping: 18 }}
            className="mt-1 font-display text-2xl font-bold text-text"
          >
            {formatPrice(savingsAmount, region)} SAVED
          </motion.p>
          {regularPrice != null ? (
            <p className="mt-1 text-xs text-muted">
              You’re getting the launch price before it goes back to{" "}
              {formatPrice(regularPrice, region)}.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-t border-border pt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
          YOUR TOTAL
        </p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <AnimatePresence mode="wait">
            <motion.span
              key={ready ? total : "loading"}
              initial={reduced ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-3xl font-bold tabular-nums text-text sm:text-4xl"
            >
              {ready ? formatPrice(total, region) : "—"}
              <span className="ml-1.5 text-sm font-semibold tracking-wide text-muted">
                TOTAL
              </span>
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="mt-2 text-xs text-muted">
          Includes instant access to everything selected
        </p>
      </div>

      <div className="relative pt-1">
        {!reduced ? (
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30 blur-2xl cta-heartbeat-glow" />
        ) : null}
        <button
          type="button"
          onClick={onBuy}
          className="cta-heartbeat relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.985]"
        >
          <span className="animate-lightning" aria-hidden>
            ⚡
          </span>
          UNLOCK THIS TREND NOW
        </button>
      </div>
      <p className="text-center text-xs text-muted">
        🔒 Secure checkout · Instant access
      </p>
    </section>
  );
}
