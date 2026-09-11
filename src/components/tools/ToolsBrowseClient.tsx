"use client";

import { useMemo, useState } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToolCard } from "@/components/tools/ToolCard";
import { useToolsCatalog } from "@/catalog/tools/useToolsCatalog";
import {
  TOOL_CATEGORIES,
  TOOL_CATEGORY_CONFIG,
  type ToolCategoryId,
} from "@/catalog/tools/types";
import { cn } from "@/lib/utils";

export function ToolsBrowseClient() {
  const {
    activeTools,
    featured,
    recommended,
    activeDeals,
    settings,
    hydrated,
  } = useToolsCatalog();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategoryId | "all">("all");

  const filtered = useMemo(() => {
    let list = activeTools;
    if (category !== "all") {
      list = list.filter(
        (t) =>
          t.primaryCategory === category || t.categories.includes(category),
      );
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.shortDescription.toLowerCase().includes(q) ||
          t.bestFor.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)) ||
          TOOL_CATEGORY_CONFIG[t.primaryCategory].label
            .toLowerCase()
            .includes(q),
      );
    }
    return list;
  }, [activeTools, category, query]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  const searching = Boolean(query.trim()) || category !== "all";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          Creator toolkit
        </p>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          AI Tools
        </h1>
        <p className="mt-3 text-muted">
          Discover image, video, music, and workflow tools curated for RHYTHM
          creators — with deals and free trials when available.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search tools, categories, tags…"
          className="w-full sm:max-w-md"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <CategoryChip
          label="All"
          active={category === "all"}
          onClick={() => setCategory("all")}
        />
        {TOOL_CATEGORIES.map((id) => (
          <CategoryChip
            key={id}
            label={TOOL_CATEGORY_CONFIG[id].label}
            active={category === id}
            onClick={() => setCategory(id)}
          />
        ))}
      </div>

      {settings.affiliateDisclosureEnabled ? (
        <p className="mt-6 text-xs leading-relaxed text-muted">
          {settings.affiliateDisclosureText}
        </p>
      ) : null}

      {!searching && featured.length > 0 ? (
        <section className="mt-12">
          <SectionHeader
            eyebrow="Spotlight"
            title="Featured tools"
            description="Hand-picked picks for creators building with AI."
          />
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-3">
            {featured.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                className="w-[280px] shrink-0 sm:w-auto"
              />
            ))}
          </div>
        </section>
      ) : null}

      {!searching && recommended.length > 0 ? (
        <section className="mt-14">
          <SectionHeader
            eyebrow="For you"
            title="Recommended"
            description="Solid everyday tools that pair well with RHYTHM workflows."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      ) : null}

      {!searching && activeDeals.length > 0 ? (
        <section className="mt-14">
          <SectionHeader
            eyebrow="Limited time"
            title="Active deals"
            description="Live sales and discounts — demo offers marked in CMS when applicable."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeDeals.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14">
        <SectionHeader
          eyebrow={searching ? "Results" : "Catalog"}
          title={searching ? "Matching tools" : "All tools"}
          description={
            searching
              ? `${filtered.length} tool${filtered.length === 1 ? "" : "s"} match your filters.`
              : "Browse the full active tools catalog."
          }
        />
        {filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center">
            <p className="font-display text-xl font-bold">No tools found</p>
            <p className="mt-2 text-sm text-muted">
              Try a different search or category, or clear filters to see
              everything.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="mt-5 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                goSrc={query.trim() ? "search" : "tools_browse"}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
        active
          ? "bg-accent text-white"
          : "border border-border bg-surface text-text-dim hover:border-accent/40 hover:text-text",
      )}
    >
      {label}
    </button>
  );
}
