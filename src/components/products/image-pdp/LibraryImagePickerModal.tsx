"use client";

import { useEffect, useMemo, useState } from "react";
import type { AiImageProductPublic } from "@/types";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatPrice, getCatalogProductQuote } from "@/lib/pricing";
import {
  dealMotivationMessage,
  formatPerImage,
  getDealQuote,
  nextTierUpsellStrip,
} from "@/lib/imageDealPricing";
import type { ImagePdpPricingTier } from "@/catalog/imagePdpTypes";
import type { Region } from "@/types";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibraryItem = {
  id: string;
  title: string;
  thumbnail: string;
  category: string;
  collectionId?: string;
  collectionName?: string;
  isTrending: boolean;
  unitPrice: number;
  unitRegular: number;
};

export function LibraryImagePickerModal({
  open,
  onClose,
  currentProductId,
  library,
  selectedIds,
  onSelectedChange,
  region,
  ready,
  onConfirm,
  pricingTiers,
}: {
  open: boolean;
  onClose: () => void;
  currentProductId: string;
  library: LibraryItem[];
  selectedIds: string[];
  onSelectedChange: (ids: string[]) => void;
  region: Region;
  ready: boolean;
  onConfirm: () => void;
  pricingTiers?: ImagePdpPricingTier[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "trending" | string>("all");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const categories = useMemo(() => {
    const set = new Set(library.map((i) => i.category).filter(Boolean));
    return [...set].sort();
  }, [library]);

  const collections = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of library) {
      if (item.collectionId && item.collectionName) {
        map.set(item.collectionId, item.collectionName);
      }
    }
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [library]);

  const filtered = useMemo(() => {
    let list = library;
    if (filter === "trending") list = list.filter((i) => i.isTrending);
    else if (filter.startsWith("col:"))
      list = list.filter((i) => i.collectionId === filter.slice(4));
    else if (filter !== "all") list = list.filter((i) => i.category === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [library, filter, query]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const count = selectedIds.length;
  const singleSale =
    library.find((i) => i.id === currentProductId)?.unitPrice ??
    library[0]?.unitPrice ??
    0;
  const singleRegular =
    library.find((i) => i.id === currentProductId)?.unitRegular ?? singleSale;

  const quote = getDealQuote(count, singleSale, region, pricingTiers);
  const upsellStrip = nextTierUpsellStrip(count, region, singleSale, pricingTiers);
  const motivation = dealMotivationMessage(count, region, singleSale, pricingTiers);

  const toggle = (id: string) => {
    if (id === currentProductId) return;
    if (selectedSet.has(id)) {
      onSelectedChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectedChange([...selectedIds, id]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black/80 backdrop-blur-sm">
      <div className="flex h-full flex-col bg-surface">
        <div className="border-b border-border px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-5xl items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                Add more images
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-text">
                Pick from the entire RHYTHM library
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mx-auto mt-4 flex max-w-5xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search images…"
                className="w-full rounded-full border border-border bg-bg py-2.5 pl-9 pr-4 text-sm outline-none focus:border-accent/45"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "trending", label: "Trending" },
                ...collections.slice(0, 3).map((c) => ({
                  id: `col:${c.id}`,
                  label: c.name.length > 18 ? `${c.name.slice(0, 16)}…` : c.name,
                })),
                ...categories.slice(0, 3).map((c) => ({ id: c, label: c })),
              ].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    filter === chip.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-muted",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
            {filtered.map((item) => {
              const selected = selectedSet.has(item.id);
              const locked = item.id === currentProductId;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border text-left transition",
                    selected
                      ? "border-accent ring-2 ring-accent/20"
                      : "border-border hover:border-accent/35",
                    locked && "cursor-default",
                  )}
                >
                  <div className="relative aspect-square">
                    <CoverImage
                      src={item.thumbnail}
                      alt=""
                      fill
                      sizes="160px"
                      className="object-cover"
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] font-semibold text-text">
                    {item.title}
                  </p>
                  <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold text-white">
                    {locked ? "Current" : selected ? "✓" : "+ Add"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border bg-surface px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-5xl space-y-3">
            <div className="rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/[0.06] to-surface p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                {count} image{count === 1 ? "" : "s"} selected
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <div>
                  <p className="font-display text-2xl font-bold tabular-nums text-text">
                    {ready ? formatPrice(quote.total, region) : "—"}
                    <span className="ml-2 text-sm font-semibold text-muted">
                      total
                    </span>
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-accent">
                    {formatPerImage(quote.perImage, region)}
                    <span className="ml-1 text-xs font-semibold uppercase tracking-wide text-muted">
                      / image
                    </span>
                  </p>
                </div>
                {quote.save > 0 ? (
                  <p className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">
                    Save {ready ? formatPrice(quote.save, region) : "—"}
                  </p>
                ) : null}
              </div>
              {motivation ? (
                <p className="mt-2 text-xs font-medium text-accent">
                  {motivation}
                </p>
              ) : null}
              {upsellStrip ? (
                <p className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-accent">
                  🔥 {upsellStrip}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="w-full rounded-full bg-accent py-3.5 text-sm font-bold text-white hover:brightness-110 sm:ml-auto sm:w-auto sm:px-8"
            >
              Add selected images
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function buildLibraryItems(
  products: AiImageProductPublic[],
  region: Region,
): LibraryItem[] {
  return products
    .filter((p) => (p.previewImages?.length ?? 1) <= 1)
    .filter((p) => !p.slug.endsWith("-collection"))
    .map((p) => {
    const quote = getCatalogProductQuote(p, region);
    const live =
      Boolean(p.offer?.enabled) &&
      (p.pricing?.[region]?.regularPrice ?? quote.regular) >
        (p.pricing?.[region]?.salePrice ?? quote.current);
    return {
      id: p.id,
      title: p.title,
      thumbnail: p.thumbnail,
      category: p.category || "Images",
      collectionId: p.imageCollection?.id ?? p.packUpgrade?.collectionId,
      collectionName: p.imageCollection?.name ?? p.packUpgrade?.collectionName,
      isTrending: p.isTrending,
      unitPrice: live ? quote.current : quote.regular,
      unitRegular: quote.regular,
    };
  });
}
