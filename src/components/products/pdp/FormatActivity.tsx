"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { CreatorActivity } from "@/types";
import { CountUp } from "@/components/motion/CountUp";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

export function FormatActivity({ activity }: { activity?: CreatorActivity }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ threshold: 0.3 });
  const reduced = usePrefersReducedMotion();
  const active = inView || reduced;
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    if (!active || reduced) return;
    const tick = () => {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 1200);
    };
    const id = window.setInterval(tick, 10000);
    const first = window.setTimeout(tick, 8000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(first);
    };
  }, [active, reduced]);

  if (!activity) return null;

  return (
    <motion.section
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-surface px-5 py-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        FORMAT ACTIVITY
      </p>
      <p className="mt-3 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
        Creators are jumping on this right now.
      </p>

      <p className="mt-4 inline-flex items-center gap-2.5 text-sm font-medium text-text">
        <span className="relative flex h-2.5 w-2.5 shrink-0" aria-hidden>
          {!reduced ? (
            <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-emerald-400/45" />
          ) : null}
          <span className="relative inline-flex h-2.5 w-2.5 animate-live-dot rounded-full bg-emerald-400" />
        </span>
        <span>
          {active ? (
            <CountUp
              to={activity.addedThisWeek}
              template={String(activity.addedThisWeek)}
              duration={900}
            />
          ) : (
            "0"
          )}{" "}
          creators added it this week
        </span>
      </p>

      <p
        className={cn(
          "mt-2 rounded-lg px-2 py-1 text-sm text-muted transition",
          nudge && "animate-activity-nudge text-text",
        )}
      >
        {activity.last24h} picked it up in the last 24 hours
      </p>
    </motion.section>
  );
}
