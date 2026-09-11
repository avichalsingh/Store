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
import type {
  CartItem,
  CatalogProduct,
  Collection,
  VideoProduct,
} from "@/types";
import { useRegion } from "@/context/RegionContext";
import { useCatalog } from "@/catalog/useCatalog";
import { getCartItemQuote, sanitizeCartItems } from "@/lib/cartPricing";

const STORAGE_KEY = "rhythm-cart-v2";

type AddProductOptions = {
  open?: boolean;
  parentProductId?: string;
  customPriceInr?: number;
};

type CartContextValue = {
  items: CartItem[];
  isOpen: boolean;
  itemCount: number;
  subtotal: number;
  bumpKey: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addVideo: (video: VideoProduct, options?: { open?: boolean }) => void;
  addCollection: (
    collection: Collection,
    thumbnail?: string,
    options?: { open?: boolean },
  ) => void;
  addProduct: (
    product: CatalogProduct,
    options?: AddProductOptions,
  ) => void;
  addProductWithAddOns: (
    main: CatalogProduct,
    addOns: Array<
      CatalogProduct | { product: CatalogProduct; customPriceInr?: number }
    >,
    options?: { open?: boolean; customPriceInr?: number },
  ) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function cartItemsAreEqual(a: CartItem[], b: CartItem[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.type !== right.type ||
      left.productId !== right.productId ||
      left.quantity !== right.quantity ||
      left.title !== right.title ||
      left.thumbnail !== right.thumbnail ||
      left.characterName !== right.characterName ||
      left.productType !== right.productType ||
      left.parentProductId !== right.parentProductId ||
      left.customPriceInr !== right.customPriceInr
    ) {
      return false;
    }
  }
  return true;
}

function characterLabel(product: CatalogProduct): string {
  if ("characterName" in product && product.characterName) {
    return product.characterName;
  }
  return product.productType.replace(/_/g, " ");
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { region } = useRegion();
  const catalog = useCatalog();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setItems([]);
      } else {
        const parsed = JSON.parse(raw) as CartItem[];
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch {
      setItems([]);
    }
    setHydrated(true);
  }, []);

  // Re-sanitize when catalog membership changes (CMS hydrate / product edits).
  // `catalog` is memoized in useCatalog — do not depend on ephemeral spreads.
  useEffect(() => {
    if (!hydrated || !catalog.hydrated) return;
    setItems((prev) => {
      const next = sanitizeCartItems(prev, catalog);
      return cartItemsAreEqual(prev, next) ? prev : next;
    });
  }, [hydrated, catalog]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen((v) => !v), []);

  const addVideo = useCallback(
    (video: VideoProduct, options?: { open?: boolean }) => {
      setItems((prev) => {
        if (prev.some((i) => i.type === "video" && i.productId === video.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `video-${video.id}`,
            type: "video",
            productId: video.id,
            productType: "VIDEO",
            title: video.title,
            characterName: video.characterName ?? "",
            thumbnail: video.thumbnail,
            quantity: 1,
          },
        ];
      });
      setBumpKey((n) => n + 1);
      if (options?.open !== false) setIsOpen(true);
    },
    [],
  );

  const addCollection = useCallback(
    (
      collection: Collection,
      thumbnail?: string,
      options?: { open?: boolean },
    ) => {
      setItems((prev) => {
        if (
          prev.some(
            (i) => i.type === "collection" && i.productId === collection.id,
          )
        ) {
          return prev;
        }
        return [
          ...prev,
          {
            id: `collection-${collection.id}`,
            type: "collection",
            productId: collection.id,
            title: collection.title,
            characterName: "Collection",
            thumbnail: thumbnail ?? collection.coverImage,
            quantity: 1,
          },
        ];
      });
      setBumpKey((n) => n + 1);
      if (options?.open !== false) setIsOpen(true);
    },
    [],
  );

  const addProduct = useCallback(
    (product: CatalogProduct, options?: AddProductOptions) => {
      setItems((prev) => {
        const already = prev.some(
          (i) =>
            i.productId === product.id &&
            i.parentProductId === options?.parentProductId,
        );
        if (already) return prev;
        return [
          ...prev,
          {
            id: options?.parentProductId
              ? `product-${product.id}-addon-${options.parentProductId}`
              : `product-${product.id}`,
            type: "product" as const,
            productId: product.id,
            productType: product.productType,
            title: product.title,
            characterName: characterLabel(product),
            thumbnail: product.thumbnail,
            quantity: 1,
            parentProductId: options?.parentProductId,
            customPriceInr: options?.customPriceInr,
          },
        ];
      });
      setBumpKey((n) => n + 1);
      if (options?.open !== false) setIsOpen(true);
    },
    [],
  );

  const addProductWithAddOns = useCallback(
    (
      main: CatalogProduct,
      addOns: Array<
        CatalogProduct | { product: CatalogProduct; customPriceInr?: number }
      >,
      options?: { open?: boolean; customPriceInr?: number },
    ) => {
      setItems((prev) => {
        let next = [...prev];
        const isVideo = main.productType === "VIDEO";
        const mainType = isVideo ? ("video" as const) : ("product" as const);
        const mainLineId = isVideo ? `video-${main.id}` : `product-${main.id}`;
        const hasMain = next.some(
          (i) => i.productId === main.id && !i.parentProductId,
        );
        if (!hasMain) {
          next.push({
            id: mainLineId,
            type: mainType,
            productId: main.id,
            productType: main.productType,
            title: main.title,
            characterName: characterLabel(main),
            thumbnail: main.thumbnail,
            quantity: 1,
            customPriceInr: options?.customPriceInr,
          });
        }
        for (const entry of addOns) {
          const addOn = "product" in entry ? entry.product : entry;
          const customPriceInr =
            "product" in entry ? entry.customPriceInr : undefined;
          const exists = next.some(
            (i) =>
              i.productId === addOn.id && i.parentProductId === main.id,
          );
          if (exists) continue;
          next.push({
            id: `product-${addOn.id}-addon-${main.id}`,
            type: "product",
            productId: addOn.id,
            productType: addOn.productType,
            title: addOn.title,
            characterName: characterLabel(addOn),
            thumbnail: addOn.thumbnail,
            quantity: 1,
            parentProductId: main.id,
            customPriceInr,
          });
        }
        return next;
      });
      setBumpKey((n) => n + 1);
      if (options?.open !== false) setIsOpen(true);
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (!target) return prev;
      // Removing a parent also removes its add-ons.
      if (!target.parentProductId) {
        return prev.filter(
          (i) =>
            i.id !== id && i.parentProductId !== target.productId,
        );
      }
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) =>
      sum + getCartItemQuote(item, region, catalog).current * item.quantity,
    0,
  );

  const value = useMemo(
    () => ({
      items,
      isOpen,
      itemCount,
      subtotal,
      bumpKey,
      openCart,
      closeCart,
      toggleCart,
      addVideo,
      addCollection,
      addProduct,
      addProductWithAddOns,
      removeItem,
      clearCart,
    }),
    [
      items,
      isOpen,
      itemCount,
      subtotal,
      bumpKey,
      openCart,
      closeCart,
      toggleCart,
      addVideo,
      addCollection,
      addProduct,
      addProductWithAddOns,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
