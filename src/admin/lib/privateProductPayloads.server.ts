/**
 * Server-only accessors for private paid CMS seed payloads.
 */
import "server-only";
import {
  MARKETPLACE_PRIVATE_PAYLOADS,
  type MarketplacePrivatePayload,
} from "@/admin/data/marketplacePrivatePayloads";
import type { PrivatePaidProductPayload } from "@/catalog/publicSafeProduct";

export function getSeedPrivatePayload(
  productId: string,
): PrivatePaidProductPayload | null {
  const id = productId.trim();
  if (!id) return null;
  const row = MARKETPLACE_PRIVATE_PAYLOADS[id] as
    | MarketplacePrivatePayload
    | undefined;
  if (!row) return null;
  const out: PrivatePaidProductPayload = {};
  if (row.promptData) out.promptData = { ...row.promptData };
  if (row.captionPackData) {
    out.captionPackData = structuredClone(row.captionPackData);
  }
  return out.promptData || out.captionPackData ? out : null;
}

export function listSeedPrivatePayloadProductIds(): string[] {
  return Object.keys(MARKETPLACE_PRIVATE_PAYLOADS);
}
