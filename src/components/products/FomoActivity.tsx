"use client";

import type { CreatorActivity } from "@/types";
import { CountUp } from "@/components/motion/CountUp";
import { TrendingBadgeLabel } from "@/components/motion/TrendingBadgeLabel";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { motion } from "framer-motion";

export function FomoBlock({
  title,
  activity,
}: {
  title: string;
  activity?: CreatorActivity;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-surface p-6">
      <p className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        Don&apos;t discover this trend too late.
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
        The best time to use a format is before it starts feeling familiar
        everywhere. {title} is currently one of the fastest-moving formats in
        the collection.
      </p>
      {activity && (
        <p className="mt-5 inline-flex items-center gap-2.5 text-sm font-semibold text-text">
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-live-ring rounded-full bg-emerald-400/50" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          FORMAT ACTIVITY IS {activity.activityLevel.toUpperCase()}
        </p>
      )}
    </div>
  );
}

export function CreatorActivityCard({ activity }: { activity: CreatorActivity }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ threshold: 0.35 });
  const reduced = usePrefersReducedMotion();
  const active = inView || reduced;

  const stats = [
    {
      label: "Creators added this format this week",
      value: activity.addedThisWeek,
      delay: 0,
    },
    {
      label: "Creators saved it",
      value: activity.saved,
      delay: 180,
    },
    {
      label: "Picked it up in the last 24 hours",
      value: activity.last24h,
      delay: 360,
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={reduced ? false : { opacity: 0, y: 14 }}
      animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.5rem] border border-border bg-surface p-6"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
        <TrendingBadgeLabel badge="🔥 Creator activity" />
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="font-display text-4xl font-bold tabular-nums text-text">
              {active ? (
                <CountUp
                  to={stat.value}
                  template={String(stat.value)}
                  duration={900}
                  delay={stat.delay}
                  overshoot
                />
              ) : (
                "0"
              )}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-sm font-medium text-text">{activity.note}</p>
    </motion.div>
  );
}
