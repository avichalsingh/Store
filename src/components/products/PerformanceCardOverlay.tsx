"use client";

import type { ProductPerformance } from "@/types";
import { CountUp } from "@/components/motion/CountUp";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

function engagementLine(performance: ProductPerformance) {
  if (performance.engagementText?.trim()) {
    return performance.engagementText.trim();
  }
  const likes = performance.secondaryMetrics.find((m) =>
    /like/i.test(m.label),
  );
  const shares = performance.secondaryMetrics.find((m) =>
    /share/i.test(m.label),
  );
  return `${likes?.value ?? "—"} likes · ${shares?.value ?? "—"} shares`;
}

export function PerformanceCardOverlay({
  performance,
  className,
  variant = "hero",
}: {
  performance: ProductPerformance;
  className?: string;
  /** `hero` = full PDP overlay copy; `card` = compact catalog metrics */
  variant?: "hero" | "card";
}) {
  const reduced = usePrefersReducedMotion();
  const badge = performance.badge?.trim() || "TRENDING NOW";
  const metricLabel = performance.primaryLabel?.trim() || "PLAYS";
  const momentum =
    performance.momentumLabel?.trim() || "Momentum is climbing";

  if (variant === "card") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-3 pb-3 pt-12 text-white",
          className,
        )}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent">
          {badge}
        </p>
        <p className="font-display text-[1.65rem] font-bold leading-none tracking-tight sm:text-3xl">
          <CountUp
            to={performance.primaryNumeric}
            template={performance.primaryMetric}
            duration={1100}
          />
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
          {metricLabel}
        </p>
        <p className="mt-1.5 text-[10px] font-medium tabular-nums text-white/85">
          {engagementLine(performance)}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/80 to-transparent px-3.5 pb-3.5 pt-14 text-white",
        className,
      )}
    >
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
        <span
          className={cn(
            "text-[11px] leading-none",
            !reduced && "animate-fire-loop",
          )}
          aria-hidden
        >
          🔥
        </span>
        {badge}
      </p>

      <p className="mt-1.5 font-display text-[1.75rem] font-bold leading-none tracking-tight sm:text-3xl">
        <CountUp
          to={performance.primaryNumeric}
          template={performance.primaryMetric}
          duration={1100}
        />
      </p>
      <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">
        {metricLabel}
      </p>

      {performance.aboveAverage ? (
        <p className="mt-1.5 text-[11px] font-semibold text-emerald-300">
          {performance.aboveAverage}
        </p>
      ) : null}

      <p className="mt-1.5 text-[10px] font-medium tabular-nums text-white/85">
        {engagementLine(performance)}
      </p>

      <p className="mt-2.5 text-[11px] font-medium leading-snug text-white/90">
        The drop hits when viewers least expect it.
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-accent/90">
        {momentum}
      </p>
    </div>
  );
}
