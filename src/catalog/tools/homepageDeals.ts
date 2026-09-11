import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import { toolDiscountPercent } from "@/catalog/tools/types";

/** True when the tool has an active sale that has not expired. */
export function isToolOfferLive(tool: AiTool, now = Date.now()): boolean {
  if (!tool.offer.saleActive) return false;
  if (tool.offer.saleEndDate) {
    const end = new Date(tool.offer.saleEndDate).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  return true;
}

/**
 * Homepage deals picker — active sales meeting min discount / verified rules,
 * capped at max count, preferring featured then recommended.
 */
export function getHomepageToolDeals(
  tools: AiTool[],
  settings: ToolsSettings,
  now = Date.now(),
): AiTool[] {
  if (!settings.homepageDealsEnabled) return [];

  const eligible = tools.filter((tool) => {
    if (tool.status !== "active") return false;
    if (!isToolOfferLive(tool, now)) return false;

    const discount = toolDiscountPercent(tool) ?? 0;
    if (discount < settings.homepageMinDiscountPercent) return false;

    // When only-verified is on, exclude demo (and other non-verified) origins.
    // Seed sets homepageOnlyVerifiedDeals: false so demo offers still show.
    if (settings.homepageOnlyVerifiedDeals) {
      if (tool.offer.origin !== "verified") return false;
    }

    return true;
  });

  const ranked = eligible.slice().sort((a, b) => {
    if (settings.homepagePreferFeatured) {
      const feat = Number(b.featured) - Number(a.featured);
      if (feat !== 0) return feat;
      const rec = Number(b.recommended) - Number(a.recommended);
      if (rec !== 0) return rec;
    }
    const disc =
      (toolDiscountPercent(b) ?? 0) - (toolDiscountPercent(a) ?? 0);
    if (disc !== 0) return disc;
    return a.sortOrder - b.sortOrder;
  });

  return ranked.slice(0, Math.max(0, settings.homepageMaxDeals));
}
