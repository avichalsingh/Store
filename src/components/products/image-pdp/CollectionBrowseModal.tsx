"use client";

import { useEffect } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import type { AiImageProductPublic } from "@/types";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function CollectionBrowseModal({
  open,
  onClose,
  title,
  products,
  includedProductIds,
  onAddToDeal,
  onSelectFullCollection,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  products: AiImageProductPublic[];
  includedProductIds: Set<string>;
  onAddToDeal: (productId: string) => void;
  onSelectFullCollection: () => void;
}) {
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.5rem] bg-surface sm:rounded-[1.5rem] sm:ring-1 sm:ring-border">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              Browse collection
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-text">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              {products.length} images available · discover what you could add
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:border-accent/40"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((p) => {
              const included = includedProductIds.has(p.id);
              const src = p.previewImages?.[0] ?? p.thumbnail;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border",
                    included ? "border-accent/40 bg-accent/[0.04]" : "border-border",
                  )}
                >
                  <div className="relative aspect-square">
                    <CoverImage
                      src={src}
                      alt=""
                      fill
                      sizes="140px"
                      className="object-cover"
                    />
                  </div>
                  <p className="truncate px-2 py-1.5 text-[10px] font-semibold text-text">
                    {p.title}
                  </p>
                  {included ? (
                    <span className="absolute left-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-bold uppercase text-white">
                      ✓ Included
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onAddToDeal(p.id);
                      }}
                      className="absolute inset-x-2 bottom-10 rounded-full bg-surface/95 py-1 text-[9px] font-bold uppercase tracking-wide text-accent ring-1 ring-accent/30 hover:bg-accent hover:text-white"
                    >
                      + Add to deal
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border bg-surface px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onSelectFullCollection();
              onClose();
            }}
            className="w-full rounded-full bg-accent py-3 text-sm font-bold text-white hover:brightness-110"
          >
            Get the full collection →
          </button>
        </div>
      </div>
    </div>
  );
}
