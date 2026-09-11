"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "@/catalog/useCatalog";
import { useCart } from "@/context/CartContext";
import { useRegion } from "@/context/RegionContext";
import {
  formatPrice,
  getCatalogProductQuote,
} from "@/lib/pricing";
import type { CatalogProduct, PriceQuote } from "@/types";
import { CoverImage } from "@/components/ui/CoverImage";
import { PRODUCT_TYPE_CONFIG } from "@/catalog/productTypes";

type ProductAddOnsSectionProps = {
  product: CatalogProduct;
  /** When false, only renders the selection UI (parent owns primary CTA). */
  showPrimaryCta?: boolean;
  primaryLabel?: string;
};

function addOnQuote(
  parent: CatalogProduct,
  addOn: CatalogProduct,
  region: "india" | "international",
): PriceQuote {
  const base = getCatalogProductQuote(addOn, region);
  const override = parent.addOnPriceOverrides?.[addOn.id];
  if (!override) return base;
  if (region === "india" && override.customPriceInr != null) {
    return { ...base, current: override.customPriceInr, saleActive: false };
  }
  if (region === "international" && override.customPriceUsd != null) {
    return { ...base, current: override.customPriceUsd, saleActive: false };
  }
  return base;
}

export function ProductAddOnsSection({
  product,
  showPrimaryCta = true,
  primaryLabel = "Add to cart",
}: ProductAddOnsSectionProps) {
  const catalog = useCatalog();
  const { region, ready } = useRegion();
  const { addProductWithAddOns, items } = useCart();
  const addOnIds = product.addOnProductIds ?? [];

  const addOns = useMemo(
    () =>
      addOnIds
        .map((id) => catalog.getProductById(id))
        .filter(Boolean) as CatalogProduct[],
    [addOnIds, catalog],
  );

  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const a of addOns) {
        if (next[a.id] === undefined) {
          next[a.id] = false;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [addOns]);

  if (addOns.length === 0) return null;

  const mainQuote = getCatalogProductQuote(product, region);
  const selectedAddOns = addOns.filter((a) => selected[a.id]);
  const addOnTotal = selectedAddOns.reduce(
    (sum, a) => sum + addOnQuote(product, a, region).current,
    0,
  );
  const total = mainQuote.current + addOnTotal;
  const alreadyInCart = items.some(
    (i) => i.productId === product.id && !i.parentProductId,
  );

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const add = () => {
    addProductWithAddOns(
      product,
      selectedAddOns.map((a) => ({
        product: a,
        customPriceInr: product.addOnPriceOverrides?.[a.id]?.customPriceInr,
      })),
    );
  };

  return (
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-5">
      <div>
        <h3 className="font-display text-lg font-bold">
          Complete your content
        </h3>
        <p className="mt-1 text-sm text-muted">
          Optional add-ons — sold separately, reusable across the store.
        </p>
      </div>

      <ul className="space-y-3">
        {addOns.map((addOn) => {
          const quote = addOnQuote(product, addOn, region);
          const config = PRODUCT_TYPE_CONFIG[addOn.productType];
          const meta =
            addOn.productType === "CAPTION_PACK"
              ? `${addOn.itemCount} caption + hashtag combos`
              : addOn.productType === "PROMPT"
                ? "Create more content in this style"
                : config.singular;
          return (
            <li key={addOn.id}>
              <label className="flex cursor-pointer gap-3 rounded-2xl border border-border bg-surface-2 p-3 transition hover:border-accent/35">
                <input
                  type="checkbox"
                  checked={Boolean(selected[addOn.id])}
                  onChange={() => toggle(addOn.id)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg">
                  <CoverImage
                    src={addOn.thumbnail}
                    alt=""
                    fill
                    sizes="40px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-text">
                    {addOn.title}
                  </p>
                  <p className="text-xs text-muted">{meta}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {ready ? `+${formatPrice(quote.current, region)}` : "—"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-muted">
          <span>{PRODUCT_TYPE_CONFIG[product.productType].singular}</span>
          <span className="tabular-nums">
            {ready ? formatPrice(mainQuote.current, region) : "—"}
          </span>
        </div>
        {selectedAddOns.map((a) => (
          <div key={a.id} className="flex justify-between text-muted">
            <span className="truncate pl-2">{a.title}</span>
            <span className="shrink-0 tabular-nums">
              +
              {ready
                ? formatPrice(addOnQuote(product, a, region).current, region)
                : "—"}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="font-semibold">Total</span>
          <span className="font-display text-xl font-bold tabular-nums">
            {ready ? formatPrice(total, region) : "—"}
          </span>
        </div>
      </div>

      {showPrimaryCta && (
        <button
          type="button"
          onClick={add}
          disabled={alreadyInCart}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {alreadyInCart ? "Already in cart" : primaryLabel}
        </button>
      )}

      {!showPrimaryCta && (
        <p className="text-xs text-muted">
          Selected add-ons are included when you buy or add to cart above.
        </p>
      )}
    </div>
  );
}
