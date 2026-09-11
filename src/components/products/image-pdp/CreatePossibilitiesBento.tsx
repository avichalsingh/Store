"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/useInViewOnce";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    id: "story",
    emoji: "🎬",
    title: "Turn it into a story",
    body: "Give this character a world, a plot and a personality.",
    className: "sm:col-span-2 sm:row-span-2 min-h-[11.5rem]",
    ambient: "story" as const,
  },
  {
    id: "dance",
    emoji: "💃",
    title: "Make it move",
    body: "Turn a still image into a dance, reaction or expressive video.",
    className: "sm:col-span-1 min-h-[8.25rem]",
    ambient: "move" as const,
  },
  {
    id: "beat",
    emoji: "🎵",
    title: "Give it a beat",
    body: "Add music, rhythm and turn it into your next Reel.",
    className: "sm:col-span-1 min-h-[8.25rem]",
    ambient: "rhyme" as const,
  },
  {
    id: "share",
    emoji: "😂",
    title: "Make people send it",
    body: "Funny, weird, cute or completely unexpected.",
    className: "sm:col-span-1 min-h-[7.5rem]",
    ambient: "none" as const,
  },
  {
    id: "reel",
    emoji: "📱",
    title: "Your next Reel starts here",
    body: "Don't overthink the first frame.",
    className: "sm:col-span-1 min-h-[7.5rem]",
    ambient: "reel" as const,
  },
  {
    id: "yours",
    emoji: "✨",
    title: "Make it yours",
    body: "Change the mood. Change the story. Make something nobody else has.",
    className: "sm:col-span-1 min-h-[7.5rem]",
    ambient: "none" as const,
  },
] as const;

export function CreatePossibilitiesBento() {
  const reduced = usePrefersReducedMotion();

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          WHAT COULD YOU CREATE?
        </p>
        <h2 className="mt-1.5 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          One image. Your next idea starts here.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:grid-rows-[auto_auto_auto]">
        {CARDS.map((card, i) => (
          <motion.article
            key={card.id}
            initial={reduced ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              duration: 0.4,
              delay: reduced ? 0 : i * 0.06,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_12px_32px_rgba(22,21,26,0.08)] sm:p-5",
              card.className,
            )}
          >
            <Ambient ambient={card.ambient} reduced={reduced} />
            <div className="relative z-[1] flex h-full flex-col">
              <span className="text-lg" aria-hidden>
                {card.emoji}
              </span>
              <h3
                className={cn(
                  "mt-2 font-semibold uppercase tracking-wide text-text",
                  card.id === "story"
                    ? "font-display text-lg sm:text-xl normal-case tracking-tight"
                    : "text-[13px] sm:text-[14px]",
                )}
              >
                {card.title}
              </h3>
              <p
                className={cn(
                  "mt-1.5 leading-snug text-muted",
                  card.id === "story" ? "text-sm max-w-[18rem]" : "text-[12px]",
                )}
              >
                {card.body}
              </p>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}

function Ambient({
  ambient,
  reduced,
}: {
  ambient: "story" | "move" | "rhyme" | "reel" | "none";
  reduced: boolean;
}) {
  if (reduced || ambient === "none") {
    return (
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(255,92,138,0.06),transparent_45%)]" />
    );
  }

  if (ambient === "story") {
    return (
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(255,92,138,0.12),transparent_50%)]" />
        <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-accent/10 blur-2xl animate-ambient-glow" />
      </div>
    );
  }

  if (ambient === "move") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,92,138,0.08),transparent_40%)]" />
        <span className="absolute bottom-3 right-3 h-1 w-10 rounded-full bg-accent/30 animate-arrow-nudge" />
      </div>
    );
  }

  if (ambient === "rhyme") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_90%,rgba(255,92,138,0.08),transparent_40%)]" />
        <span className="absolute right-4 top-4 text-accent/40 animate-particle-a text-xs">
          ♪
        </span>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,92,138,0.08),transparent_45%)]" />
      <span className="absolute bottom-4 left-4 right-4 h-0.5 overflow-hidden rounded-full bg-border">
        <span className="block h-full w-1/3 rounded-full bg-accent/50 animate-arrow-nudge" />
      </span>
    </div>
  );
}
