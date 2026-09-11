"use client";

import { useEffect, useState } from "react";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatPrice } from "@/lib/pricing";
import type { Region } from "@/types";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function FullCollectionModal({
  open,
  onClose,
  title,
  images,
  imageCount,
  comparePrice,
  salePrice,
  saveAmount,
  region,
  ready,
  onPurchase,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  images: string[];
  imageCount: number;
  comparePrice: number;
  salePrice: number;
  saveAmount: number;
  region: Region;
  ready: boolean;
  onPurchase: () => void;
}) {
  const [preview, setPreview] = useState(0);

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

  const list = images.length ? images : [];

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
              Full collection
            </p>
            <h2 className="mt-1 font-display text-xl font-bold text-text">{title}</h2>
            <p className="mt-0.5 text-sm text-muted">{imageCount} images included</p>
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
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setPreview(i)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-xl border transition",
                  preview === i ? "border-accent ring-2 ring-accent/25" : "border-border",
                )}
              >
                <CoverImage src={src} alt="" fill sizes="140px" className="object-cover" />
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  ✓
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-border bg-surface px-5 py-4">
          <p className="text-sm font-semibold text-text">
            {imageCount} images ·{" "}
            {comparePrice > salePrice ? (
              <span className="text-muted line-through tabular-nums">
                {ready ? formatPrice(comparePrice, region) : "—"}
              </span>
            ) : null}{" "}
            <span className="font-display text-xl font-bold tabular-nums">
              {ready ? formatPrice(salePrice, region) : "—"}
            </span>
          </p>
          {saveAmount > 0 ? (
            <p className="mt-1 text-xs font-bold text-accent">
              SAVE {ready ? formatPrice(saveAmount, region) : "—"}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => {
              onPurchase();
              onClose();
            }}
            className="mt-3 w-full rounded-full bg-accent py-3 text-sm font-bold text-white hover:brightness-110"
          >
            ⚡ UNLOCK ALL {imageCount} — {ready ? formatPrice(salePrice, region) : "—"}
          </button>
        </div>
      </div>
    </div>
  );
}
