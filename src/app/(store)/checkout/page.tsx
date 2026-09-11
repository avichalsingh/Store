"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { usePurchases } from "@/context/PurchaseContext";
import { useRegion } from "@/context/RegionContext";
import { useCatalog } from "@/catalog/useCatalog";
import { formatPrice, regionLabel } from "@/lib/pricing";
import { getCartItemQuote } from "@/lib/cartPricing";
import { CoverImage } from "@/components/ui/CoverImage";

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const { addPurchasesFromCart } = usePurchases();
  const { region, ready } = useRegion();
  const catalog = useCatalog();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Checkout
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Almost there
      </h1>
      <p className="mt-3 text-muted">
        Payments are not connected yet. This screen is a placeholder for Stripe
        or Razorpay.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        Prices shown in{" "}
        <span className="font-medium text-text">
          {ready ? regionLabel(region) : "…"}
        </span>{" "}
        based on your location.
      </div>

      {items.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border p-10 text-center">
          <p className="font-display text-xl font-bold">Nothing to checkout</p>
          <Link
            href="/explore"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
          >
            Browse videos
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-6">
          <ul className="space-y-3">
            {items.map((item) => {
              const quote = getCartItemQuote(item, region, catalog);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="relative h-16 w-12 overflow-hidden rounded-xl">
                    <CoverImage
                      src={item.thumbnail}
                      alt=""
                      fill
                      sizes="48px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.title}</p>
                    <p className="text-xs text-muted">
                      {item.characterName}
                      {item.parentProductId ? " · Add-on" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {ready ? formatPrice(quote.current, region) : "—"}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-5 py-4">
            <span className="text-muted">Total</span>
            <span className="font-display text-2xl font-bold tabular-nums">
              {ready ? formatPrice(subtotal, region) : "—"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              addPurchasesFromCart(items, catalog);
              clearCart();
              alert("Demo order placed — your library is updated.");
              router.push("/account");
            }}
            className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Place order (demo)
          </button>
        </div>
      )}
    </div>
  );
}
