"use client";

import { Check } from "lucide-react";
import type { CatalogProduct, Region } from "@/types";
import { CoverImage } from "@/components/ui/CoverImage";
import { formatPrice } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";

export type AddOnLine = {
  product: CatalogProduct;
  price: number;
};

function addOnCopy(product: CatalogProduct) {
  if (product.productType === "CAPTION_PACK") {
    return {
      badge: "🔥 MOST POPULAR ADD-ON",
      popular: true,
      title: "Caption + Hashtag Pack",
      description:
        "Paired caption and hashtag combos built for this trend — copy, paste, and post.",
      value: "Save time writing from scratch",
    };
  }
  return {
    badge: PRODUCT_TYPE_CONFIG[product.productType].singular.toUpperCase(),
    popular: false,
    title: product.title,
    description: product.description,
    value: "Add to your order",
  };
}

export function VideoAddOns({
  addOns,
  selectedIds,
  onToggle,
  region,
  ready,
}: {
  addOns: AddOnLine[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  region: Region;
  ready: boolean;
}) {
  if (addOns.length === 0) return null;

  const anySelected = selectedIds.size > 0;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          MAKE IT HIT HARDER
        </p>
        <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-text sm:text-2xl">
          Turn one trend into a complete post.
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          Add the finishing pieces creators usually spend extra time making.
        </p>
      </div>

      <ul className="space-y-3">
        {addOns.map(({ product, price }) => {
          const selected = selectedIds.has(product.id);
          const copy = addOnCopy(product);

          return (
            <li key={product.id}>
              <button
                type="button"
                onClick={() => onToggle(product.id)}
                className={cn(
                  "group flex w-full flex-col gap-3 rounded-2xl border px-4 py-4 text-left transition duration-200",
                  selected
                    ? "border-accent/55 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(255,92,138,0.12)]"
                    : "border-border bg-surface hover:-translate-y-0.5 hover:border-accent/35 hover:bg-surface-2/50",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]",
                      copy.popular
                        ? "bg-accent/15 text-accent animate-save-badge"
                        : "bg-surface-2 text-muted",
                    )}
                  >
                    {copy.badge}
                  </span>
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition duration-200",
                      selected
                        ? "scale-100 border-accent bg-accent text-white"
                        : "border-border bg-surface-2 text-transparent group-hover:border-accent/40",
                    )}
                    aria-hidden
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg">
                    <CoverImage
                      src={product.thumbnail}
                      alt=""
                      fill
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">
                      {copy.title}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {copy.description}
                    </p>
                    <p className="mt-2 text-[11px] font-medium text-accent/90">
                      {copy.value}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
                  <span className="text-sm font-bold tabular-nums text-text">
                    {ready ? `+${formatPrice(price, region)}` : "—"}
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-[0.12em]",
                      selected ? "text-accent" : "text-muted",
                    )}
                  >
                    {selected ? "ADDED" : "ADD TO MY ORDER"}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {anySelected ? (
        <p className="rounded-xl border border-accent/25 bg-accent/[0.06] px-3.5 py-2.5 text-sm font-medium text-text">
          🔥 Added — you&apos;re building the complete trend pack.
        </p>
      ) : null}
    </section>
  );
}
