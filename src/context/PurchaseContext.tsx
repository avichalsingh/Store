"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { userOwnsProductId } from "@/catalog/contentPackMigration";
import type { StorefrontCatalog } from "@/catalog/mapAdminToStorefront";
import { createClient } from "@/lib/supabase/client";
import type { CartItem, PurchasedItem } from "@/types";

type PurchaseContextValue = {
  purchases: PurchasedItem[];
  hydrated: boolean;
  ownsProductId: (id: string) => boolean;
  /** Reloads purchases from verified server entitlements. */
  refreshPurchases: () => Promise<void>;
  /**
   * Legacy local merge helper — must not be used as payment fulfillment.
   * Kept so accidental demo checkout paths stay grep-detectable / disabled.
   */
  addPurchasesFromCart: (
    items: CartItem[],
    catalog: StorefrontCatalog,
  ) => void;
};

const PurchaseContext = createContext<PurchaseContextValue | null>(null);

function cartLineToPurchase(
  item: CartItem,
  purchasedAt: string,
): PurchasedItem {
  return {
    id: `purchase-${item.productId}-${purchasedAt}`,
    productId: item.productId,
    title: item.title,
    characterName: item.characterName,
    thumbnail: item.thumbnail,
    purchasedAt,
    type: item.type,
    productType:
      item.productType ??
      (item.type === "video"
        ? "VIDEO"
        : item.type === "collection"
          ? "COLLECTION"
          : undefined),
  };
}

async function fetchServerPurchases(): Promise<
  { ok: true; purchases: PurchasedItem[]; status: number } | { ok: false; status: number }
> {
  const res = await fetch("/api/account/purchases", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });
  if (res.status === 401) {
    return { ok: true, purchases: [], status: 401 };
  }
  const body = (await res.json().catch(() => null)) as {
    ok?: boolean;
    purchases?: PurchasedItem[];
  } | null;
  if (!res.ok || !body?.ok || !Array.isArray(body.purchases)) {
    return { ok: false, status: res.status };
  }
  return { ok: true, purchases: body.purchases, status: res.status };
}

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refreshPurchases = useCallback(async () => {
    try {
      const result = await fetchServerPurchases();
      if (result.ok) {
        // 401 → empty list (never keep prior user's entitlements).
        setPurchases(result.purchases);
      }
      // Transient non-auth failures: keep prior list only while still signed in;
      // auth listener clears on SIGNED_OUT before a 401 refresh.
    } catch {
      // Network error — do not invent ownership; leave state unchanged.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    void refreshPurchases();
  }, [refreshPurchases]);

  // Clear/replace purchases on auth changes so A→B account switches cannot leak.
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (cancelled) return;
        if (event === "SIGNED_OUT") {
          setPurchases([]);
          setHydrated(true);
          return;
        }
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          void refreshPurchases();
        }
      });
      subscription = data.subscription;
    } catch {
      // Auth client unavailable — leave purchases empty after initial refresh.
    }
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [refreshPurchases]);

  const ownsProductId = useCallback(
    (id: string) =>
      userOwnsProductId(
        id,
        purchases.map((p) => p.productId),
      ),
    [purchases],
  );

  /** Not used for Razorpay fulfillment — server entitlements are authoritative. */
  const addPurchasesFromCart = useCallback(
    (items: CartItem[], catalog: StorefrontCatalog) => {
      const purchasedAt = new Date().toISOString().slice(0, 10);
      setPurchases((prev) => {
        const owned = new Set(prev.map((p) => p.productId));
        const next = [...prev];

        const pushIfNew = (entry: PurchasedItem) => {
          if (owned.has(entry.productId)) return;
          owned.add(entry.productId);
          next.push(entry);
        };

        for (const item of items) {
          pushIfNew(cartLineToPurchase(item, purchasedAt));

          if (
            item.productType === "BUNDLE" ||
            (item.type === "product" &&
              catalog.getProductById(item.productId)?.productType === "BUNDLE")
          ) {
            const product = catalog.getProductById(item.productId);
            if (product?.productType === "BUNDLE") {
              for (const includedId of product.includedProductIds) {
                if (owned.has(includedId)) continue;
                const included = catalog.getProductById(includedId);
                if (!included) continue;
                pushIfNew({
                  id: `purchase-${includedId}-${purchasedAt}`,
                  productId: includedId,
                  title: included.title,
                  characterName:
                    "characterName" in included && included.characterName
                      ? included.characterName
                      : included.productType.replace(/_/g, " "),
                  thumbnail: included.thumbnail,
                  purchasedAt,
                  type: "product",
                  productType: included.productType,
                });
              }
            }
          }
        }

        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      purchases,
      hydrated,
      ownsProductId,
      refreshPurchases,
      addPurchasesFromCart,
    }),
    [purchases, hydrated, ownsProductId, refreshPurchases, addPurchasesFromCart],
  );

  return (
    <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error("usePurchases must be used within PurchaseProvider");
  return ctx;
}
