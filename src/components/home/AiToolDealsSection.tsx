"use client";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToolCard } from "@/components/tools/ToolCard";
import { useToolsCatalog } from "@/catalog/tools/useToolsCatalog";
import { getHomepageToolDeals } from "@/catalog/tools/homepageDeals";

export function AiToolDealsSection() {
  const { activeTools, settings, hydrated } = useToolsCatalog();

  if (!hydrated || !settings.homepageDealsEnabled) return null;

  const deals = getHomepageToolDeals(activeTools, settings);
  if (deals.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <SectionHeader
        eyebrow="Creator deals"
        title="AI tool deals"
        description="Active discounts on tools that pair with RHYTHM — affiliate links may apply."
        href="/tools"
        linkLabel="Browse all tools"
      />
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 pt-2 hide-scrollbar sm:-mx-0 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {deals.map((tool) => (
          <ToolCard
            key={tool.id}
            tool={tool}
            goSrc="homepage_deals"
            className="w-[280px] shrink-0 sm:w-auto"
          />
        ))}
      </div>
      {settings.affiliateDisclosureEnabled ? (
        <p className="mt-2 text-xs text-muted">
          {settings.affiliateDisclosureText}
        </p>
      ) : null}
    </section>
  );
}
