import Link from "next/link";
import { Clock3, Clapperboard, Layers3, Sparkles } from "lucide-react";
import { DEFAULT_SECTION_COPY } from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";

const points = [
  {
    icon: Clock3,
    title: "Save production time",
    text: "Buy ready-to-use AI dance videos and creative assets instead of building every Reels or Shorts clip from scratch.",
  },
  {
    icon: Clapperboard,
    title: "Post consistently",
    text: "Stock a content calendar with vertical motion, AI-generated images, and prompt workflows made for social feeds.",
  },
  {
    icon: Layers3,
    title: "Shop curated sets",
    text: "Collections and bundles group complementary assets so campaigns, niches, and aesthetics stay coherent.",
  },
  {
    icon: Sparkles,
    title: "Focus on growth work",
    text: "Spend more time on captions, publishing, and community — and less time on production logistics.",
  },
];

export function WhyPragviSection({ copy }: HomepageSectionViewProps = {}) {
  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY["why-pragvi"].eyebrow || "";
  const title =
    copy?.title?.trim() || DEFAULT_SECTION_COPY["why-pragvi"].title || "";
  const description =
    copy?.description?.trim() ||
    DEFAULT_SECTION_COPY["why-pragvi"].description ||
    "";
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY["why-pragvi"].ctaLabel ||
    "Explore the marketplace";
  const ctaHref =
    copy?.ctaHref?.trim() ||
    DEFAULT_SECTION_COPY["why-pragvi"].ctaHref ||
    "/explore";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-10 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base text-muted">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {points.map((point) => (
          <div
            key={point.title}
            className="rounded-[1.5rem] border border-border bg-surface p-6 transition hover:border-accent/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <point.icon size={20} />
            </span>
            <h3 className="mt-4 font-display text-xl font-bold text-text">
              {point.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{point.text}</p>
          </div>
        ))}
      </div>
      <div className="mt-8">
        <Link
          href={ctaHref}
          className="text-sm font-semibold text-accent transition hover:brightness-110"
        >
          {ctaLabel} →
        </Link>
      </div>
    </section>
  );
}
