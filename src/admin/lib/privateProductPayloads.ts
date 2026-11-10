/**
 * Client-safe admin private-payload helpers.
 *
 * Private seed data lives server-only (`marketplacePrivatePayloads.ts`) and is
 * loaded through GET /api/admin/private-payloads after httpOnly session verify.
 * This module must never import the seed file or write private bodies to
 * localStorage / shared CMS state.
 */

import type { AdminProduct } from "@/admin/types";
import {
  extractPrivatePaidProductPayload,
  mergePrivatePaidProductPayload,
  preferRicherPrivatePayload,
  type PrivatePaidProductPayload,
} from "@/catalog/publicSafeProduct";

/** @deprecated Legacy vault key — no longer written or read. */
export const PRIVATE_PAYLOADS_STORAGE_KEY = "rhythm-admin-private-payloads-v8";

/** Paths where private CMS payloads may be requested (still needs server verify). */
export function isAdminPrivateContentPath(
  pathname: string | null | undefined = typeof window !== "undefined"
    ? window.location.pathname
    : null,
): boolean {
  if (!pathname) return false;
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    return false;
  }
  return true;
}

/**
 * @deprecated Forgeable — localStorage is not authorization.
 * Always false for private-content decisions. Kept for grep/tests migration.
 */
export function isAdminCmsContext(): boolean {
  return false;
}

/** Verified httpOnly admin cookie via existing session API. */
export async function verifyAdminServerSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const res = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Gate for requesting private paid text in the admin UI.
 * Requires admin private path (not login) + verified server session.
 */
export async function canAccessAdminPrivatePayloads(
  pathname?: string | null,
): Promise<boolean> {
  if (!isAdminPrivateContentPath(pathname)) return false;
  return verifyAdminServerSession();
}

/**
 * @deprecated Local vault disabled — always returns {}.
 * Kept so accidental callers stay fail-closed.
 */
export function loadPrivatePayloadMap(options?: {
  authorized: boolean;
}): Record<string, PrivatePaidProductPayload> {
  void options;
  return {};
}

/**
 * @deprecated Local vault disabled — no-op.
 */
export function persistPrivatePayloadMap(
  map: Record<string, PrivatePaidProductPayload>,
  options?: { authorized: boolean },
): void {
  void map;
  void options;
  // Intentionally empty — private bodies must not enter localStorage.
}

/** Collect private fields from in-memory products (editor/publish helpers). */
export function collectPrivatePayloadsFromProducts(
  products: AdminProduct[],
  previous: Record<string, PrivatePaidProductPayload> = {},
): Record<string, PrivatePaidProductPayload> {
  const next = { ...previous };
  for (const product of products) {
    const extracted = extractPrivatePaidProductPayload(product);
    if (extracted) {
      next[product.id] = preferRicherPrivatePayload(next[product.id], extracted);
    }
  }
  return next;
}

export function applyPrivatePayloadsToProducts(
  products: AdminProduct[],
  map: Record<string, PrivatePaidProductPayload>,
): AdminProduct[] {
  return products.map((p) => mergePrivatePaidProductPayload(p, map[p.id]));
}

/**
 * Fetch private seed/payload for one product via authenticated admin API.
 * Returns null when unauthorized, missing, or empty.
 */
export async function fetchAdminPrivatePayload(
  productId: string,
  pathname?: string | null,
): Promise<PrivatePaidProductPayload | null> {
  const id = productId.trim();
  if (!id) return null;
  if (!(await canAccessAdminPrivatePayloads(pathname))) return null;
  try {
    const res = await fetch(
      `/api/admin/private-payloads?productId=${encodeURIComponent(id)}`,
      {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as {
      ok?: boolean;
      payload?: PrivatePaidProductPayload | null;
    };
    if (!body.ok || !body.payload) return null;
    return body.payload;
  } catch {
    return null;
  }
}

/**
 * @deprecated Use fetchAdminPrivatePayload. Seed module is server-only.
 */
export async function loadSeedPrivatePayloads(options?: {
  authorized: boolean;
}): Promise<Record<string, PrivatePaidProductPayload>> {
  if (!options?.authorized) return {};
  // Client must not import marketplacePrivatePayloads — always empty here.
  return {};
}
