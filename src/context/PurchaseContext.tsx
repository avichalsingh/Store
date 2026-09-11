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
import type { CartItem, PurchasedItem } from "@/types";

const STORAGE_KEY = "rhythm-purchases-v1";

type PurchaseContextValue = {
  purchases: PurchasedItem[];
  hydrated: boolean;
  ownsProductId: (id: string) => boolean;
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

export function PurchaseProvider({ children }: { children: ReactNode }) {
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setPurchases([]);
      } else {
        const parsed = JSON.parse(raw) as PurchasedItem[];
        setPurchases(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setPurchases([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(purchases));
  }, [purchases, hydrated]);

  const ownsProductId = useCallback(
    (id: string) =>
      userOwnsProductId(
        id,
        purchases.map((p) => p.productId),
      ),
    [purchases],
  );

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

          // Expand bundles into individual entitlements.
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
      addPurchasesFromCart,
    }),
    [purchases, hydrated, ownsProductId, addPurchasesFromCart],
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
