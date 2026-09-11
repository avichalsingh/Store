"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { useCatalog } from "@/catalog/useCatalog";
import { VideoCard } from "@/components/products/VideoCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { FilterPanel, type FilterState } from "@/components/products/FilterPanel";
import { TrendingStrip } from "@/components/home/TrendingStrip";
import { useRegion } from "@/context/RegionContext";
import { PRICE_FILTER_BOUNDS, getVideoQuote } from "@/lib/pricing";

type SortKey = "newest" | "trending" | "price-asc" | "price-desc" | "title";

function ExploreContent() {
  const searchParams = useSearchParams();
  const { region } = useRegion();
  const { videos } = useCatalog();
  const bounds = PRICE_FILTER_BOUNDS[region];
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({
    character: "all",
    category: "all",
    trendingOnly: false,
    newestOnly: false,
    maxPrice: bounds.max,
  });
  const [sort, setSort] = useState<SortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setFilters((f) => ({ ...f, maxPrice: bounds.max }));
  }, [bounds.max]);

  useEffect(() => {
    const category = searchParams.get("category");
    const sortParam = searchParams.get("sort");
    if (category) {
      setFilters((f) => ({ ...f, category }));
    }
    if (sortParam === "trending") {
      setSort("trending");
      setFilters((f) => ({ ...f, trendingOnly: true }));
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let list = [...videos];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          (v.characterName ?? "").toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.tags.some((t) => t.includes(q))
      );
    }

    if (filters.character !== "all") {
      list = list.filter((v) => v.characterId === filters.character);
    }
    if (filters.category !== "all") {
      list = list.filter((v) => v.category === filters.category);
    }
    if (filters.trendingOnly) {
      list = list.filter((v) => v.isTrending);
    }
    if (filters.newestOnly) {
      list = list.filter((v) => v.isNew);
    }
    list = list.filter(
      (v) => getVideoQuote(v, region).current <= filters.maxPrice
    );

    switch (sort) {
      case "trending":
        list.sort(
          (a, b) =>
            Number(b.isTrending) - Number(a.isTrending) ||
            getVideoQuote(b, region).current -
              getVideoQuote(a, region).current
        );
        break;
      case "price-asc":
        list.sort(
          (a, b) =>
            getVideoQuote(a, region).current -
            getVideoQuote(b, region).current
        );
        break;
      case "price-desc":
        list.sort(
          (a, b) =>
            getVideoQuote(b, region).current -
            getVideoQuote(a, region).current
        );
        break;
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }

    return list;
  }, [videos, query, filters, sort, region]);

  return (
    <>
      <div className="pt-20">
        <TrendingStrip />
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
            Shop
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Explore dances
          </h1>
          <p className="mt-3 text-muted">
            Filter by character, vibe, and price. Preview vertically. Add what
            you love.
          </p>
        </div>

        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center">
          <SearchBar value={query} onChange={setQuery} className="flex-1" />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-medium text-text-dim transition hover:border-accent/40 hover:text-text lg:hidden"
            >
              <SlidersHorizontal size={16} />
              Filters
            </button>
            <label className="sr-only" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer rounded-full border border-border bg-surface px-4 py-2.5 text-sm text-text outline-none"
            >
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <div className={filtersOpen ? "block" : "hidden lg:block"}>
            <FilterPanel filters={filters} onChange={setFilters} open />
          </div>

          <div>
            <p className="mb-5 text-sm text-muted">
              {filtered.length} {filtered.length === 1 ? "video" : "videos"}
            </p>
            {filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center">
                <p className="font-display text-xl font-bold">No matches</p>
                <p className="mt-2 text-sm text-muted">
                  Try clearing filters or searching a different vibe.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {filtered.map((video) => (
                  <VideoCard key={video.id} video={video} className="w-auto" />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 pt-28 text-muted">Loading…</div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
