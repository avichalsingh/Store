"use client";

import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { categories } from "@/data/collections";
import { useCatalog } from "@/catalog/useCatalog";
import { useRegion } from "@/context/RegionContext";
import { PRICE_FILTER_BOUNDS, formatPrice } from "@/lib/pricing";

export type FilterState = {
  character: string;
  category: string;
  trendingOnly: boolean;
  newestOnly: boolean;
  maxPrice: number;
};

type FilterPanelProps = {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  className?: string;
  open?: boolean;
};

export function FilterPanel({
  filters,
  onChange,
  className,
  open = true,
}: FilterPanelProps) {
  const { region, ready } = useRegion();
  const { characters, videos } = useCatalog();
  const bounds = PRICE_FILTER_BOUNDS[region];
  const styleOptions = useMemo(() => {
    const fromVideos = Array.from(
      new Set(videos.map((v) => v.category).filter(Boolean)),
    ).sort();
    if (fromVideos.length > 0) {
      return fromVideos.map((name) => ({ id: name, name }));
    }
    return categories;
  }, [videos]);

  useEffect(() => {
    if (filters.maxPrice > bounds.max || filters.maxPrice < bounds.min) {
      onChange({ ...filters, maxPrice: bounds.max });
    }
    // intentionally sync when region bounds change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, bounds.max, bounds.min]);

  if (!open) return null;

  const reset = () =>
    onChange({
      character: "all",
      category: "all",
      trendingOnly: false,
      newestOnly: false,
      maxPrice: bounds.max,
    });

  return (
    <aside
      className={cn(
        "space-y-6 rounded-2xl border border-border bg-surface p-5",
        className
      )}
    >
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Character
        </h3>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filters.character === "all"}
            onClick={() => onChange({ ...filters, character: "all" })}
          >
            All
          </FilterChip>
          {characters.map((c) => (
            <FilterChip
              key={c.id}
              active={filters.character === c.id}
              onClick={() => onChange({ ...filters, character: c.id })}
            >
              {c.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Style
        </h3>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            active={filters.category === "all"}
            onClick={() => onChange({ ...filters, category: "all" })}
          >
            All
          </FilterChip>
          {styleOptions.map((c) => (
            <FilterChip
              key={c.id}
              active={filters.category === c.name}
              onClick={() => onChange({ ...filters, category: c.name })}
            >
              {c.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
          Max price:{" "}
          {ready ? formatPrice(filters.maxPrice, region) : "…"}
        </h3>
        <input
          type="range"
          min={bounds.min}
          max={bounds.max}
          step={bounds.step}
          value={Math.min(filters.maxPrice, bounds.max)}
          onChange={(e) =>
            onChange({ ...filters, maxPrice: Number(e.target.value) })
          }
          className="w-full cursor-pointer accent-accent"
          aria-label="Maximum price"
        />
      </div>

      <div className="space-y-3">
        <label className="flex cursor-pointer items-center gap-3 text-sm text-text-dim">
          <input
            type="checkbox"
            checked={filters.trendingOnly}
            onChange={(e) =>
              onChange({ ...filters, trendingOnly: e.target.checked })
            }
            className="cursor-pointer accent-accent"
          />
          Trending only
        </label>
        <label className="flex cursor-pointer items-center gap-3 text-sm text-text-dim">
          <input
            type="checkbox"
            checked={filters.newestOnly}
            onChange={(e) =>
              onChange({ ...filters, newestOnly: e.target.checked })
            }
            className="cursor-pointer accent-accent"
          />
          New releases
        </label>
      </div>

      <button
        type="button"
        onClick={reset}
        className="cursor-pointer text-sm text-muted transition hover:text-accent"
      >
        Reset filters
      </button>
    </aside>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-accent text-white"
          : "bg-surface-2 text-text-dim hover:bg-surface-3 hover:text-text"
      )}
    >
      {children}
    </button>
  );
}
