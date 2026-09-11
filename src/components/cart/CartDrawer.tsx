"use client";

import { CoverImage } from "@/components/ui/CoverImage";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useRegion } from "@/context/RegionContext";
import { useCatalog } from "@/catalog/useCatalog";
import { formatPrice } from "@/lib/pricing";
import { getCartItemQuote } from "@/lib/cartPricing";
import { CartUpsells } from "@/components/cart/CartUpsells";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, subtotal, itemCount } =
    useCart();
  const { region, ready } = useRegion();
  const catalog = useCatalog();

  const parents = items.filter((item) => !item.parentProductId);
  const addOnsByParent = items.reduce<Record<string, typeof items>>(
    (acc, item) => {
      if (!item.parentProductId) return acc;
      (acc[item.parentProductId] ??= []).push(item);
      return acc;
    },
    {},
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close cart overlay"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-text">
                  Your cart
                </h2>
                <p className="text-xs text-muted">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-xl font-bold text-text">
                    Cart is empty
                  </p>
                  <p className="mt-2 max-w-[220px] text-sm text-muted">
                    Discover a character and pick a move to get started.
                  </p>
                  <Link
                    href="/explore"
                    onClick={closeCart}
                    className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Explore videos
                  </Link>
                </div>
              ) : (
                <ul className="space-y-4">
                  {parents.map((item) => {
                    const quote = getCartItemQuote(item, region, catalog);
                    const addOns = addOnsByParent[item.productId] ?? [];
                    return (
                      <li key={item.id} className="space-y-2">
                        <div className="flex gap-3 rounded-2xl border border-border bg-surface-2 p-3">
                          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl">
                            <CoverImage
                              src={item.thumbnail}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-text">
                              {item.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {item.characterName}
                              {item.type === "collection" ? " · Pack" : ""}
                              {item.productType && item.productType !== "VIDEO"
                                ? ` · ${item.productType.replace(/_/g, " ")}`
                                : ""}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm font-semibold tabular-nums">
                                {ready
                                  ? formatPrice(quote.current, region)
                                  : "—"}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-muted transition hover:text-accent"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                        {addOns.map((addon) => {
                          const addonQuote = getCartItemQuote(
                            addon,
                            region,
                            catalog,
                          );
                          return (
                            <div
                              key={addon.id}
                              className={cn(
                                "ml-6 flex gap-3 rounded-xl border border-border/70 bg-surface p-2.5",
                              )}
                            >
                              <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg">
                                <CoverImage
                                  src={addon.thumbnail}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="36px"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-text">
                                  {addon.title}
                                </p>
                                <p className="text-[10px] uppercase tracking-wide text-muted">
                                  Add-on
                                </p>
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-xs font-semibold tabular-nums">
                                    {ready
                                      ? formatPrice(addonQuote.current, region)
                                      : "—"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeItem(addon.id)}
                                    className="text-[10px] text-muted transition hover:text-accent"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </li>
                    );
                  })}
                </ul>
              )}
              {items.length > 0 && <CartUpsells onNavigate={closeCart} />}
            </div>

            {items.length > 0 && (
              <div className="border-t border-border px-5 py-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted">Subtotal</span>
                  <span className="font-display text-xl font-bold tabular-nums">
                    {ready ? formatPrice(subtotal, region) : "—"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="rounded-full bg-accent py-3 text-center text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Checkout
                  </Link>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="rounded-full border border-border py-3 text-sm font-medium text-text-dim transition hover:border-accent/40 hover:text-text"
                  >
                    Continue shopping
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
