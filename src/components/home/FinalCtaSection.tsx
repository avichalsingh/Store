"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { DEFAULT_SECTION_COPY } from "@/catalog/homepageConfig";
import type { HomepageSectionViewProps } from "@/components/home/homepageSectionProps";

export function FinalCtaSection({ copy }: HomepageSectionViewProps = {}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const eyebrow =
    copy?.eyebrow?.trim() || DEFAULT_SECTION_COPY["final-cta"].eyebrow || "";
  const title =
    copy?.title?.trim() || DEFAULT_SECTION_COPY["final-cta"].title || "";
  const description = (
    copy?.description?.trim() ||
    DEFAULT_SECTION_COPY["final-cta"].description ||
    ""
  )
    // KYC: never advertise AI Tools / creator-tools catalog on the storefront.
    .replace(/\s*,?\s*and creator tools/gi, "")
    .replace(/\s*creator tools\s*,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const ctaLabel =
    copy?.ctaLabel?.trim() ||
    DEFAULT_SECTION_COPY["final-cta"].ctaLabel ||
    "Explore Marketplace";
  const ctaHref =
    copy?.ctaHref?.trim() ||
    DEFAULT_SECTION_COPY["final-cta"].ctaHref ||
    "/explore";
  const secondaryCtaLabel =
    copy?.secondaryCtaLabel?.trim() ||
    DEFAULT_SECTION_COPY["final-cta"].secondaryCtaLabel ||
    "Explore Collections";
  const secondaryCtaHref =
    copy?.secondaryCtaHref?.trim() ||
    DEFAULT_SECTION_COPY["final-cta"].secondaryCtaHref ||
    "/collections";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-accent/25 bg-gradient-to-br from-accent via-[#ff7aa0] to-[#ff9bb8] px-6 py-12 text-bg sm:rounded-[3rem] sm:px-10 sm:py-14 lg:px-14">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bg/70">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight text-bg sm:text-4xl lg:text-5xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-4 max-w-lg text-base text-bg/75">{description}</p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-bg px-5 py-3 text-sm font-semibold text-text transition hover:bg-surface"
              >
                {ctaLabel}
                <ArrowUpRight size={15} />
              </Link>
              <Link
                href={secondaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full border border-bg/35 px-5 py-3 text-sm font-semibold text-bg transition hover:bg-bg/10"
              >
                {secondaryCtaLabel}
              </Link>
            </div>
          </div>

          <form
            className="w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (!email.trim()) return;
              setDone(true);
            }}
          >
            <label className="sr-only" htmlFor="pragvi-updates-email">
              Email for product updates
            </label>
            {done ? (
              <p className="rounded-full bg-bg/15 px-5 py-4 text-sm font-medium text-bg">
                You&apos;re on the list for new marketplace drops.
              </p>
            ) : (
              <div className="flex items-center gap-2 rounded-full bg-bg p-1.5 shadow-lg shadow-black/20">
                <input
                  id="pragvi-updates-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email here"
                  className="min-w-0 flex-1 rounded-full bg-transparent px-4 py-2.5 text-sm text-text outline-none placeholder:text-muted"
                />
                <button
                  type="submit"
                  aria-label="Subscribe for updates"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:brightness-110"
                >
                  <ArrowUpRight size={18} />
                </button>
              </div>
            )}
            <p className="mt-3 text-xs text-bg/65">
              Optional product updates. No spam. No fake social proof.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
