"use client";

import { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import type { ProductPerformance } from "@/types";
import { CountUp } from "@/components/motion/CountUp";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

const GRAPH_PATH =
  "M4 52 C 22 50, 28 34, 42 36 S 62 16, 78 22 S 100 8, 148 10";

function engagementLine(performance: ProductPerformance) {
  if (performance.engagementText?.trim()) return performance.engagementText.trim();
  const likes = performance.secondaryMetrics.find((m) =>
    /like/i.test(m.label),
  );
  const shares = performance.secondaryMetrics.find((m) =>
    /share/i.test(m.label),
  );
  return `${likes?.value ?? "—"} likes · ${shares?.value ?? "—"} shares`;
}

export function ViralPerformanceCard({
  performance,
  className,
}: {
  performance: ProductPerformance;
  className?: string;
}) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ threshold: 0.3 });
  const reduced = usePrefersReducedMotion();
  const active = inView || reduced;
  const [colorReady, setColorReady] = useState(reduced);

  useEffect(() => {
    if (!active || reduced) return;
    const t = window.setTimeout(() => setColorReady(true), 1100);
    return () => window.clearTimeout(t);
  }, [active, reduced]);

  const badge = performance.badge?.trim() || "TRENDING NOW";
  const metricLabel = performance.primaryLabel?.trim() || "PLAYS";
  const insight =
    performance.insight?.trim() ||
    "Strong hook retention in the first 3 seconds.";
  const supporting =
    performance.supportingText?.trim() ||
    "This format is gaining momentum right now.";
  const momentum =
    performance.momentumLabel?.trim() || "MOMENTUM IS CLIMBING ↑";

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("trend-rail rounded-[1.75rem] p-[1.5px]", className)}
    >
      <div className="trend-rail-inner relative overflow-hidden rounded-[calc(1.75rem-1.5px)] bg-surface p-5 sm:p-7">
        <div className="relative z-[2] grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end sm:gap-6">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              <span
                className={cn(
                  "text-sm leading-none",
                  !reduced && "animate-fire-loop",
                )}
                aria-hidden
              >
                🔥
              </span>
              {badge}
            </p>

            <p
              className={cn(
                "mt-3 font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl",
                colorReady && !reduced
                  ? "animate-metric-glow"
                  : "text-[#20232B]",
              )}
            >
              {active ? (
                <CountUp
                  to={performance.primaryNumeric}
                  template={performance.primaryMetric}
                  duration={1100}
                />
              ) : (
                <span className="opacity-30">0</span>
              )}
            </p>
            <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              {metricLabel}
            </p>

            <p className="mt-4 text-sm tabular-nums text-text-dim">
              {engagementLine(performance)}
            </p>

            <p className="mt-3 max-w-md text-[15px] font-medium leading-snug text-text">
              {insight}
            </p>
            <p className="mt-2 text-sm text-muted">{supporting}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end justify-end gap-2 self-end">
            <PerformanceGraph active={active} reduced={reduced} />
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              {momentum}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PerformanceGraph({
  active,
  reduced,
}: {
  active: boolean;
  reduced: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const length = 210;
  const drawn = active && !reduced;
  const [live, setLive] = useState(reduced);

  useEffect(() => {
    if (!drawn) {
      setLive(reduced);
      return;
    }
    const t = window.setTimeout(() => setLive(true), 1200);
    return () => window.clearTimeout(t);
  }, [drawn, reduced]);

  return (
    <svg
      className={cn(
        "h-[4.25rem] w-[9.5rem] sm:h-[4.75rem] sm:w-[11rem]",
        !reduced && live && "animate-graph-rise",
      )}
      viewBox="0 0 156 60"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${uid}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(168,59,91,0.22)" />
          <stop offset="55%" stopColor="rgba(214,90,123,0.75)" />
          <stop offset="100%" stopColor="#d65a7b" />
        </linearGradient>
        <filter
          id={`${uid}-glow`}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="1.6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d={`${GRAPH_PATH} L148 58 L4 58 Z`}
        fill="rgba(214,90,123,0.06)"
        className={cn(!reduced && live && "animate-graph-fill")}
      />

      <path
        d={GRAPH_PATH}
        stroke={`url(#${uid}-line)`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeDasharray={length}
        strokeDashoffset={drawn || reduced ? 0 : length}
        className={cn(!reduced && live && "animate-graph-shimmer")}
        style={{
          transition: drawn
            ? "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)"
            : "none",
        }}
      />

      {live && !reduced ? (
        <path
          d={GRAPH_PATH}
          stroke="rgba(255, 210, 220, 0.7)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="16 194"
          className="animate-graph-highlight"
        />
      ) : null}

      <circle
        cx="148"
        cy="10"
        r="3.6"
        fill="#d65a7b"
        className={cn(live && !reduced && "animate-graph-end")}
        filter={live && !reduced ? `url(#${uid}-glow)` : undefined}
      />

      {live && !reduced ? (
        <circle r="3.2" fill="#ffe0e8" filter={`url(#${uid}-glow)`}>
          <animateMotion
            dur="2.6s"
            repeatCount="indefinite"
            path={GRAPH_PATH}
            keyPoints="0;1;1"
            keyTimes="0;0.72;1"
            calcMode="linear"
          />
          <animate
            attributeName="opacity"
            values="0;1;1;0.35;0"
            keyTimes="0;0.08;0.68;0.82;1"
            dur="2.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values="2.4;3.4;3.4;4.2;2.4"
            keyTimes="0;0.08;0.68;0.82;1"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
    </svg>
  );
}
