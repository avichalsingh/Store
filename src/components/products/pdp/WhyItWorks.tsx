"use client";

import { motion } from "framer-motion";
import { Eye, RotateCcw, Sparkles } from "lucide-react";
import type { CreatorInsight, VideoProduct } from "@/types";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";

type ReasonCard = CreatorInsight & {
  Icon: typeof Eye;
};

const DEFAULT_REASONS: ReasonCard[] = [
  {
    icon: "hook",
    Icon: Eye,
    title: "Instant visual hook",
    description:
      "The movement creates a pattern break before viewers scroll away.",
  },
  {
    icon: "replay",
    Icon: RotateCcw,
    title: "Made for the replay",
    description:
      "The delayed drop creates a “wait… what?” moment that encourages another watch.",
  },
  {
    icon: "spark",
    Icon: Sparkles,
    title: "Easy to make your own",
    description:
      "Use your own character, style or personality without rebuilding the whole concept.",
  },
];

const ICON_BY_TITLE: Record<string, typeof Eye> = {
  "Instant visual hook": Eye,
  "Made for the replay": RotateCcw,
  "Easy to make your own": Sparkles,
};

export function WhyItWorks({ video }: { video: VideoProduct }) {
  const reasons: ReasonCard[] =
    video.creatorInsights && video.creatorInsights.length >= 3
      ? video.creatorInsights.slice(0, 3).map((r) => ({
          ...r,
          Icon: ICON_BY_TITLE[r.title] ?? Sparkles,
          description:
            r.title === "Instant visual hook"
              ? "The movement creates a pattern break before viewers scroll away."
              : r.description,
        }))
      : DEFAULT_REASONS;

  const { ref, inView } = useInViewOnce<HTMLDivElement>({ threshold: 0.2 });
  const reduced = usePrefersReducedMotion();
  const active = inView || reduced;

  return (
    <section ref={ref} className="space-y-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          WHY IT&apos;S WORKING
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          Built to stop the scroll.
        </h2>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {reasons.map((reason, i) => (
          <motion.article
            key={reason.title}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{
              duration: 0.35,
              delay: reduced ? 0 : i * 0.12,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-xl border border-border bg-surface px-3.5 py-3 transition duration-200 hover:border-accent/25"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
                <reason.Icon size={12} strokeWidth={2.25} />
              </span>
              <h3 className="text-[13px] font-semibold leading-tight text-text">
                {reason.title}
              </h3>
            </div>
            <p className="mt-1.5 text-[12px] leading-snug text-muted">
              {reason.description}
            </p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
