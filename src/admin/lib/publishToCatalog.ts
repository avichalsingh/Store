import type { AdminProduct } from "@/admin/types";

export type PublishCatalogResult =
  | { ok: true; id: string; status: string }
  | { ok: false; error: string; status: number };

/**
 * Client helper: publish/republish an active product to Supabase via the
 * server-only admin catalog route (uses httpOnly session cookie).
 */
export async function publishProductToCatalog(
  product: AdminProduct,
): Promise<PublishCatalogResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/catalog/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ product }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the catalog publish API",
      status: 0,
    };
  }

  let body: { error?: string; id?: string; status?: string; ok?: boolean } = {};
  try {
    body = (await response.json()) as typeof body;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : "Failed to publish product to the storefront catalog";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
    };
  }

  return {
    ok: true,
    id: body.id ?? product.id,
    status: body.status ?? product.status,
  };
}
