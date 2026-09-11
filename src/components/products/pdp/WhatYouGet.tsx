"use client";

import { motion } from "framer-motion";
import type { PdpValueCard, VideoProduct } from "@/types";
import { useInViewOnce, usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

const VALUE_CARD =
  "rounded-xl border border-border bg-surface px-3.5 py-3 transition-[box-shadow,border-color] duration-300 ease-out hover:border-accent/35 hover:shadow-[0_10px_28px_rgba(22,21,26,0.07)]";

const SPEC_CARD =
  "rounded-xl border border-border bg-surface px-3 py-3 text-left transition-[box-shadow,border-color] duration-300 ease-out hover:border-accent/35 hover:shadow-[0_10px_28px_rgba(22,21,26,0.07)]";

function defaultValueCards(video: VideoProduct): PdpValueCard[] {
  return [
    {
      badge: "VIDEO INCLUDED",
      title: `Complete ${video.title} video`,
      description:
        "Full 1080×1920 vertical video, ready for Reels, Shorts and TikTok.",
    },
    {
      badge: "INSTANT ACCESS",
      title: "No waiting. No processing.",
      description:
        "Your file becomes available immediately after checkout.",
    },
    {
      badge: "POST-READY",
      title: "Built for where people actually watch",
      description:
        "Optimized for vertical feeds, full-screen viewing and fast publishing.",
    },
  ];
}

export function WhatYouGet({ video }: { video: VideoProduct }) {
  const { ref, inView } = useInViewOnce<HTMLDivElement>({ threshold: 0.2 });
  const reduced = usePrefersReducedMotion();
  const active = inView || reduced;

  const items =
    video.pdpValueCards && video.pdpValueCards.length > 0
      ? video.pdpValueCards.slice(0, 3)
      : defaultValueCards(video);

  const details = video.fileDetails ?? {
    dimensionsMain: "1080 × 1920",
    dimensionsSupporting: "Full HD vertical video",
    formatMain: video.format || "MP4",
    formatSupporting: "Ready-to-post file",
    accessMain: video.access || "Instant access",
    accessSupporting: "Download after checkout",
    usageMain: "Personal + social",
    usageSupporting: "Use it in your own content",
  };

  const specs = [
    {
      key: "res",
      primary: details.dimensionsMain,
      secondary: details.dimensionsSupporting,
      kind: "emphasis" as const,
    },
    {
      key: "mp4",
      primary: details.formatMain,
      secondary: details.formatSupporting,
      kind: "emphasis" as const,
    },
    {
      key: "instant",
      primary: (
        <>
          <span
            className={cn("inline-block", !reduced && "animate-lightning")}
            aria-hidden
          >
            ⚡
          </span>{" "}
          {details.accessMain.replace(/^⚡\s*/, "")}
        </>
      ),
      secondary: details.accessSupporting,
      kind: "action" as const,
    },
    {
      key: "license",
      primary: (
        <>
          <span className="text-accent" aria-hidden>
            ✓
          </span>{" "}
          {details.usageMain.replace(/^✓\s*/, "")}
        </>
      ),
      secondary: details.usageSupporting,
      kind: "action" as const,
    },
  ];

  return (
    <section ref={ref} className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          YOUR PURCHASE INCLUDES
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          Everything you need to post it today.
        </h2>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {items.map((item, i) => (
          <motion.div
            key={`${item.badge}-${i}`}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{
              duration: 0.35,
              delay: reduced ? 0 : i * 0.1,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={VALUE_CARD}
          >
            <span
              className={cn(
                "relative inline-flex overflow-hidden text-[10px] font-bold uppercase tracking-[0.14em] text-accent",
                /instant/i.test(item.badge) && !reduced && "badge-shimmer",
              )}
            >
              {item.badge}
            </span>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-text">
              {item.title}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              {item.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {specs.map((spec, i) => (
          <motion.div
            key={spec.key}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            transition={{
              duration: 0.35,
              delay: reduced ? 0 : 0.28 + i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={SPEC_CARD}
          >
            <p
              className={cn(
                "leading-tight text-text",
                spec.kind === "emphasis"
                  ? "font-display text-[15px] font-bold tracking-tight sm:text-base"
                  : "text-[13px] font-bold",
              )}
            >
              {spec.primary}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted">
              {spec.secondary}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
