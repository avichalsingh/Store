"use client";

import { useEffect, useState } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { DealGalleryItem } from "@/lib/imageDealGallery";

export function ImageGallery({
  items,
  title,
  headerLabel,
  mode = "selected",
}: {
  items: DealGalleryItem[];
  title: string;
  headerLabel: string;
  mode?: "selected" | "collection";
}) {
  const list = items.length ? items : [];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, list.length - 1)));
  }, [list.map((x) => x.id).join("|"), list.length]);

  if (list.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-[1.75rem] bg-surface-2 text-sm text-muted ring-1 ring-border">
        No preview
      </div>
    );
  }

  const main = list[Math.min(active, list.length - 1)]!;
  const multi = list.length > 1;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
        {headerLabel}
      </p>

      <div className="group relative overflow-hidden rounded-[1.75rem] ring-1 ring-border">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="relative block aspect-square w-full overflow-hidden bg-surface-2"
          aria-label={`Preview ${title}`}
        >
          <CoverImage
            src={main.src}
            alt=""
            fill
            priority
            sizes="(max-width: 1024px) 90vw, 28rem"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
          />
        </button>

        <div className="absolute left-3 top-3 z-10">
          <span className="rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow-lg">
            {mode === "collection"
              ? "Full collection"
              : list.length === 1
                ? "✓ Your image"
                : "In your deal"}
          </span>
        </div>

        {multi ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() =>
                setActive((i) => (i - 1 + list.length) % list.length)
              }
              className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setActive((i) => (i + 1) % list.length)}
              className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <ChevronRight size={18} />
            </button>
          </>
        ) : null}

        <p className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-white backdrop-blur-sm">
          {active + 1} / {list.length}
        </p>
      </div>

      <div
        className={cn(
          "gap-2",
          list.length > 6
            ? "flex overflow-x-auto pb-1 scrollbar-thin"
            : "grid",
          list.length <= 6 && list.length > 1 && "grid-cols-4 sm:grid-cols-6",
          list.length === 1 && "grid-cols-1",
        )}
      >
        {list.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "relative aspect-square shrink-0 overflow-hidden rounded-xl ring-1 transition",
              list.length > 6 ? "h-16 w-16" : "w-full",
              active === i
                ? "ring-accent shadow-[0_0_0_1px_rgba(255,92,138,0.25)]"
                : "ring-border hover:ring-accent/40",
            )}
          >
            <CoverImage src={item.src} alt="" fill sizes="72px" />
            {multi ? (
              <span className="absolute left-1 top-1 rounded bg-black/50 px-1 text-[9px] font-bold tabular-nums text-white">
                {i + 1}
              </span>
            ) : null}
            <span className="absolute bottom-0 left-0 right-0 bg-accent/90 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
              {list.length === 1 ? "✓ Your image" : "✓ Included"}
            </span>
          </button>
        ))}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setLightbox(false)}
          >
            <X size={18} />
          </button>
          <div
            className="relative max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-square w-full bg-black">
              <CoverImage
                src={list[active]!.src}
                alt=""
                fill
                className="object-contain"
                sizes="800px"
              />
            </div>
            {multi ? (
              <div className="flex items-center justify-between bg-black/80 px-4 py-3 text-white">
                <button
                  type="button"
                  onClick={() =>
                    setActive((i) => (i - 1 + list.length) % list.length)
                  }
                  className="text-sm font-medium"
                >
                  Previous
                </button>
                <span className="text-xs tabular-nums text-white/70">
                  {active + 1} / {list.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActive((i) => (i + 1) % list.length)}
                  className="text-sm font-medium"
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
