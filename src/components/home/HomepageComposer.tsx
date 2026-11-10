"use client";

import type { HomepageSectionId } from "@/admin/types";
import { useHomepageConfig } from "@/catalog/useHomepageConfig";
import { BundlesShowcaseSection } from "@/components/home/BundlesShowcaseSection";
import { CollectionsShowcaseSection } from "@/components/home/CollectionsShowcaseSection";
import { FeaturedDanceVideosSection } from "@/components/home/FeaturedDanceVideosSection";
import { FinalCtaSection } from "@/components/home/FinalCtaSection";
import { HeroSection } from "@/components/home/HeroSection";
import { ImagesShowcaseSection } from "@/components/home/ImagesShowcaseSection";
import { PromptsDiscoverySection } from "@/components/home/PromptsDiscoverySection";
import { TrendingSection } from "@/components/home/TrendingSection";
import { TrendingStrip } from "@/components/home/TrendingStrip";
import { WhyPragviSection } from "@/components/home/WhyPragviSection";
import type { ReactNode } from "react";

function renderSection(
  id: HomepageSectionId,
  cfg: ReturnType<typeof useHomepageConfig>,
): ReactNode {
  const section = cfg.getSection(id);
  const copy = cfg.getCopy(id);
  const content = section?.content;

  switch (id) {
    case "hero":
      // homepageHero (cfg.hero) is the sole live source for headline + CTA —
      // not homepageSections[hero].copy.
      return <HeroSection key={id} hero={cfg.hero} />;
    case "trending":
      return <TrendingSection key={id} copy={copy} content={content} />;
    case "trending-strip":
      return <TrendingStrip key={id} copy={copy} content={content} />;
    case "featured-videos":
      return (
        <FeaturedDanceVideosSection key={id} copy={copy} content={content} />
      );
    case "images":
      return <ImagesShowcaseSection key={id} copy={copy} content={content} />;
    case "collections":
      return (
        <CollectionsShowcaseSection key={id} copy={copy} content={content} />
      );
    case "bundles":
      return <BundlesShowcaseSection key={id} copy={copy} content={content} />;
    case "ai-tools":
      // AI Tools catalog is out of KYC scope — never fetch /api/tools.
      return null;
    case "prompts":
      return <PromptsDiscoverySection key={id} copy={copy} content={content} />;
    case "why-pragvi":
      return <WhyPragviSection key={id} copy={copy} />;
    case "final-cta":
      return <FinalCtaSection key={id} copy={copy} />;
    default:
      return null;
  }
}

/**
 * Renders the redesigned homepage from CMS section visibility + order.
 * Visual layout of each section stays in its component.
 */
export function HomepageComposer() {
  const cfg = useHomepageConfig();

  return <>{cfg.enabledSections.map((s) => renderSection(s.id, cfg))}</>;
}
