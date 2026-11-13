"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { usePurchases } from "@/context/PurchaseContext";
import { useCatalog } from "@/catalog/useCatalog";
import { formatPrice } from "@/lib/pricing";
import {
  getCheckoutInrQuote,
  getCheckoutLineQuantity,
  getCheckoutLineTotalInr,
  sumCheckoutInr,
} from "@/lib/cartPricing";
import { gateRazorpayCheckoutOpen } from "@/lib/commerce/pricing";
import { CoverImage } from "@/components/ui/CoverImage";
import { createClient } from "@/lib/supabase/client";

type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutInstance = {
  open: () => void;
  on: (
    event: string,
    handler: (response: { error?: { description?: string } }) => void,
  ) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const { items, clearCart } = useCart();
  const { refreshPurchases } = usePurchases();
  const catalog = useCatalog();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const paymentsConfigured = Boolean(
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.trim(),
  );
  /** Razorpay Stage 1 charges INR only — display must match charge currency. */
  const inrTotal = sumCheckoutInr(items, catalog);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (cancelled) return;
        const email = data.user?.email ?? null;
        setUserEmail(email);
        setAuthReady(true);
        // Middleware also gates /checkout; this covers client navigations
        // if the session is missing after hydration.
        if (!email) {
          router.replace(`/signin?next=${encodeURIComponent("/checkout")}`);
        }
      } catch {
        if (!cancelled) {
          setUserEmail(null);
          setAuthReady(true);
          router.replace(`/signin?next=${encodeURIComponent("/checkout")}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const onPay = useCallback(async () => {
    setError(null);
    if (!userEmail) {
      setError("Sign in with Supabase Auth before paying.");
      return;
    }
    if (!paymentsConfigured) {
      setError(
        "Razorpay test keys are not configured (NEXT_PUBLIC_RAZORPAY_KEY_ID).",
      );
      return;
    }
    if (!items.length) return;

    setBusy(true);
    try {
      const createRes = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity:
              typeof item.quantity === "number" &&
              Number.isInteger(item.quantity) &&
              item.quantity >= 1
                ? item.quantity
                : 1,
            ...(item.parentProductId
              ? { parentProductId: item.parentProductId }
              : {}),
          })),
        }),
      });
      const created = (await createRes.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        orderId?: string;
        razorpayOrderId?: string;
        amountPaise?: number;
        currency?: string;
        keyId?: string;
      } | null;

      if (
        !createRes.ok ||
        !created?.ok ||
        !created.orderId ||
        !created.razorpayOrderId ||
        typeof created.amountPaise !== "number"
      ) {
        setError(created?.error || "Could not create order");
        setBusy(false);
        return;
      }

      // Authoritative charge is server amountPaise; refuse if UI INR total differs.
      const amountGate = gateRazorpayCheckoutOpen({
        displayedInrMajor: inrTotal,
        serverAmountPaise: created.amountPaise,
      });
      if (!amountGate.ok) {
        setError(amountGate.message);
        setBusy(false);
        return;
      }

      const scriptOk = await loadRazorpayScript();
      if (!scriptOk || !window.Razorpay) {
        setError("Could not load Razorpay Checkout");
        setBusy(false);
        return;
      }

      const orderId = created.orderId;
      const amountPaise = created.amountPaise;
      const rzp = new window.Razorpay({
        key: created.keyId,
        amount: amountPaise,
        currency: created.currency || "INR",
        name: "PRAGVI",
        description: "Digital product purchase",
        order_id: created.razorpayOrderId,
        prefill: { email: userEmail },
        handler: async (response: RazorpaySuccess) => {
          try {
            const verifyRes = await fetch("/api/checkout/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verified = (await verifyRes.json().catch(() => null)) as {
              ok?: boolean;
              error?: string;
            } | null;
            if (!verifyRes.ok || !verified?.ok) {
              setError(
                verified?.error ||
                  "Payment received but verification failed. Contact support with your payment id.",
              );
              return;
            }
            // Entitlements are created server-side in verify-payment; refresh
            // Account/Library from that source of truth (never trust client-only).
            await refreshPurchases();
            clearCart();
            router.push("/account");
          } catch {
            setError("Verification request failed");
          } finally {
            setBusy(false);
          }
        },
        modal: {
          ondismiss: () => {
            setBusy(false);
            setError(
              "Checkout was closed before payment completed. No charge was completed for this attempt — you can try again when ready.",
            );
          },
        },
      });
      rzp.on("payment.failed", (response: { error?: { description?: string } }) => {
        setBusy(false);
        setError(
          response?.error?.description ||
            "Payment failed. No purchase was unlocked. You can try again or use a different method.",
        );
      });
      rzp.open();
    } catch {
      setError("Checkout failed");
      setBusy(false);
    }
  }, [
    userEmail,
    paymentsConfigured,
    items,
    inrTotal,
    clearCart,
    refreshPurchases,
    router,
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Checkout
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Almost there
      </h1>
      <p className="mt-3 text-muted">
        Secure checkout via Razorpay (test mode until live keys are enabled).
        Amounts below are INR catalog prices; the server re-prices from the
        database before creating the Razorpay order.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        Charged currency: <span className="font-medium text-text">INR</span>{" "}
        (Razorpay). Line prices match INR catalog amounts — not USD browse
        prices.
      </div>

      {!authReady ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Checking session…
        </div>
      ) : userEmail ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Signed in as{" "}
          <span className="font-medium text-text">{userEmail}</span>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          Redirecting to sign in…
        </div>
      )}

      {!paymentsConfigured ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted">
          Razorpay is not configured in this environment. For local staging,
          add test keys to a gitignored{" "}
          <code className="text-xs">.env.staging.razorpay</code> file (see
          staging launcher), then restart{" "}
          <code className="text-xs">npm run dev:staging</code>. Required keys:{" "}
          <code className="text-xs">NEXT_PUBLIC_RAZORPAY_KEY_ID</code>,{" "}
          <code className="text-xs">RAZORPAY_KEY_ID</code>,{" "}
          <code className="text-xs">RAZORPAY_KEY_SECRET</code>, and{" "}
          <code className="text-xs">RAZORPAY_WEBHOOK_SECRET</code> (test mode
          only).
        </div>
      ) : null}

      <div className="mt-4 space-y-2 text-xs text-muted">
        <p>
          You are buying intangible digital products. After successful payment
          verification, entitled access appears in your signed-in Account /
          Library. There is no physical parcel shipping for ordinary catalogue
          purchases. Standard purchases are personal-use licences only — not
          commercial rights. Change-of-mind refunds are not offered after
          successful digital delivery, subject to mandatory legal remedies (see
          Refunds). Support:{" "}
          <a
            href="mailto:support@pragvi.com"
            className="underline hover:text-text"
          >
            support@pragvi.com
          </a>
          .
        </p>
        <p>
          By paying you agree to our{" "}
          <Link href="/terms" className="underline hover:text-text">
            Terms
          </Link>
          ,{" "}
          <Link href="/privacy" className="underline hover:text-text">
            Privacy Policy
          </Link>
          ,{" "}
          <Link href="/refunds" className="underline hover:text-text">
            Refunds
          </Link>
          , and{" "}
          <Link href="/delivery" className="underline hover:text-text">
            Digital Delivery
          </Link>{" "}
          policies.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-text">
          {error}
        </div>
      ) : null}

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
              const quote = getCheckoutInrQuote(item, catalog);
              const quantity = getCheckoutLineQuantity(item);
              const lineTotal = getCheckoutLineTotalInr(item, catalog);
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
                    <p className="mt-1 text-xs tabular-nums text-muted">
                      {formatPrice(quote.current, "india")} × {quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatPrice(lineTotal, "india")}
                  </p>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between rounded-2xl bg-surface-2 px-5 py-4">
            <span className="text-muted">INR total</span>
            <span className="font-display text-2xl font-bold tabular-nums">
              {formatPrice(inrTotal, "india")}
            </span>
          </div>

          <button
            type="button"
            disabled={
              busy || !userEmail || !paymentsConfigured || !authReady
            }
            onClick={() => void onPay()}
            className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Starting Razorpay…" : "Pay securely with Razorpay"}
          </button>
        </div>
      )}
    </div>
  );
}
