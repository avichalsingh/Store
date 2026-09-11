"use client";

import Link from "next/link";
import { CoverImage } from "@/components/ui/CoverImage";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { useCatalog } from "@/catalog/useCatalog";
import { Badge } from "@/components/ui/Badge";

export function HeroSection() {
  const { videos, getTrendingVideos } = useCatalog();
  const trending = getTrendingVideos(6);
  const pool = trending.length >= 3 ? trending : videos;
  const picks = [pool[1] ?? pool[0], pool[0], pool[2] ?? pool[5] ?? pool[0]].filter(
    Boolean,
  );
  const labels = ["Trending", "Most Loved", "New"] as const;
  const layout = [
    { rotate: -6, y: 20, z: 30 },
    { rotate: 2, y: 0, z: 40 },
    { rotate: 8, y: 28, z: 20 },
  ];
  const heroCards = picks.slice(0, 3).map((video, i) => ({
    video,
    label: labels[i] ?? "Featured",
    ...layout[i],
  }));

  return (
    <section className="relative overflow-hidden pb-16 pt-28 sm:pb-24 sm:pt-32 lg:pb-28">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-accent/15 blur-[100px]" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-accent-2/15 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:px-8">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-accent"
          >
            Digital dance studio
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05 }}
            className="font-display text-balance text-5xl font-bold leading-[0.95] tracking-tight text-text sm:text-6xl lg:text-7xl"
          >
            Characters that
            <span className="block text-accent">move the feed.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mt-6 max-w-lg text-base leading-relaxed text-muted sm:text-lg"
          >
            Browse premium AI character dance videos — vertical, ready to use,
            and built for creators who want motion that feels alive.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <Link
              href="/characters"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Explore Characters
            </Link>
            <Link
              href="/explore?sort=trending"
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-text transition hover:border-accent/40 hover:text-accent"
            >
              Watch Trending
            </Link>
          </motion.div>
        </div>

        <div className="relative mx-auto flex h-[460px] w-full max-w-[520px] items-center justify-center sm:h-[520px]">
          {heroCards.map((card, index) => (
            <motion.div
              key={card.video.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: card.y }}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.08 }}
              className="absolute w-[150px] transition duration-300 hover:-translate-y-2 sm:w-[180px]"
              style={{
                zIndex: card.z,
                left: `${18 + index * 22}%`,
                rotate: `${card.rotate}deg`,
              }}
            >
              <Link
                href={`/videos/${card.video.slug}`}
                aria-label={`${card.video.title} by ${card.video.characterName}`}
                className="group relative block overflow-hidden rounded-[1.35rem] shadow-2xl shadow-black/50 ring-1 ring-white/10"
              >
                <div className="relative aspect-[9/16] overflow-hidden">
                  <div className="absolute inset-0 origin-center transition-transform duration-500 ease-out group-hover:scale-[1.06]">
                    <CoverImage
                      src={card.video.thumbnail}
                      alt=""
                      fill
                      priority={index === 1}
                      sizes="180px"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                  <div className="absolute left-2.5 top-2.5">
                    <Badge tone={index === 1 ? "accent" : "neutral"}>
                      {card.label}
                    </Badge>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-90">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25">
                      <Play
                        size={16}
                        fill="white"
                        className="ml-0.5 text-white"
                      />
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    {card.video.performance ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
                          {card.video.performance.badge}
                        </p>
                        <p className="font-display text-2xl font-bold leading-none text-white">
                          {card.video.performance.primaryMetric}
                        </p>
                        <p className="text-[10px] uppercase tracking-wide text-white/70">
                          {card.video.performance.primaryLabel}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">
                          {card.video.characterName}
                        </p>
                        <p className="truncate text-sm font-semibold text-white">
                          {card.video.title}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
