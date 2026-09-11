"use client";

import type { Collection } from "@/types";
import { useCatalog } from "@/catalog/useCatalog";
import { useRegion } from "@/context/RegionContext";
import {
  formatPrice,
  getCollectionQuote,
  getVideoQuote,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

type CollectionValueStackProps = {
  collection: Collection;
  className?: string;
};

export function CollectionValueStack({
  collection,
  className,
}: CollectionValueStackProps) {
  const { region, ready } = useRegion();
  const catalog = useCatalog();
  const quote = getCollectionQuote(collection, region);
  const videos = collection.videoIds
    .map((id) => catalog.getVideoById(id))
    .filter(Boolean);
  const saveAmount = Math.max(quote.regular - quote.current, 0);
  const stack =
    collection.valueStack ??
    [
      `${collection.videoIds.length} ready-to-use dance videos`,
      "Vertical 9:16 format",
      "High-quality resolution",
      "Instant access",
      "Commercial license options",
    ];

  return (
    <section
      className={cn(
        "grid gap-8 rounded-[1.75rem] border border-accent/25 bg-surface p-6 sm:p-8 lg:grid-cols-2",
        className
      )}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          The full {collection.title}
        </p>
        <p className="mt-2 font-display text-2xl font-bold text-text">You get</p>
        <ul className="mt-4 space-y-2.5">
          {stack.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-text-dim">
              <span className="text-accent">✓</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Individual value
        </p>
        <ul className="mt-4 max-h-48 space-y-2 overflow-y-auto pr-1 text-sm">
          {videos.map((video) =>
            video ? (
              <li
                key={video.id}
                className="flex items-center justify-between gap-3 text-text-dim"
              >
                <span className="truncate">{video.title}</span>
                <span className="shrink-0 tabular-nums">
                  {ready
                    ? formatPrice(getVideoQuote(video, region).current, region)
                    : "—"}
                </span>
              </li>
            ) : null
          )}
        </ul>
        <div className="mt-5 space-y-3 border-t border-border pt-4 text-sm">
          <div className="flex justify-between text-muted">
            <span>If bought individually</span>
            <span className="tabular-nums line-through">
              {ready ? formatPrice(quote.regular, region) : "—"}
            </span>
          </div>
          <div className="flex justify-between font-semibold text-text">
            <span>Your collection price</span>
            <span className="font-display text-2xl tabular-nums">
              {ready ? formatPrice(quote.current, region) : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between font-semibold text-accent">
            <span>You save</span>
            <span className="inline-flex items-center gap-2">
              <span className="tabular-nums">
                {ready ? formatPrice(saveAmount, region) : "—"}
              </span>
              {quote.discountPct > 0 && (
                <span className="animate-save-badge rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-white">
                  SAVE {quote.discountPct}%
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
