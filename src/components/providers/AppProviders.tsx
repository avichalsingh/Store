"use client";

import { AdminProvider } from "@/admin/store/AdminProvider";
import { CartProvider } from "@/context/CartContext";
import { PurchaseProvider } from "@/context/PurchaseContext";
import { RegionProvider } from "@/context/RegionContext";
import { ThemeProvider } from "@/context/ThemeContext";
import type { ReactNode } from "react";

/**
 * App-wide providers. AdminProvider is at the root so Admin and Storefront
 * share one CMS source of truth (localStorage + IndexedDB media blobs).
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <RegionProvider>
        <AdminProvider>
          <PurchaseProvider>
            <CartProvider>{children}</CartProvider>
          </PurchaseProvider>
        </AdminProvider>
      </RegionProvider>
    </ThemeProvider>
  );
}
