import type { AiTool, ToolsSettings } from "@/catalog/tools/types";
import { toolDiscountPercent } from "@/catalog/tools/types";

/** True when the tool has an active sale that has started and has not expired. */
export function isToolOfferLive(tool: AiTool, now = Date.now()): boolean {
  if (!tool.offer.saleActive) return false;
  if (tool.offer.saleStartDate) {
    const start = new Date(tool.offer.saleStartDate).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }
  if (tool.offer.saleEndDate) {
    const end = new Date(tool.offer.saleEndDate).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  return true;
}

function isEligibleHomepageDeal(
  tool: AiTool,
  settings: ToolsSettings,
  now: number,
): boolean {
  if (tool.status !== "active") return false;
  if (!isToolOfferLive(tool, now)) return false;

  const discount = toolDiscountPercent(tool) ?? 0;
  if (discount < settings.homepageMinDiscountPercent) return false;

  if (settings.homepageOnlyVerifiedDeals) {
    // Launch-first: accept verified OR manual (no auto-discovery pipeline).
    const origin = tool.offer.origin;
    if (origin !== "verified" && origin !== "manual") return false;
  }

  return true;
}

function algorithmicRank(eligible: AiTool[], settings: ToolsSettings): AiTool[] {
  return eligible.slice().sort((a, b) => {
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
}

/**
 * Homepage deals picker — active sales meeting min discount / verified rules,
 * capped at max count. Optional `homepageDealToolIds` pins explicit order
 * (invalid / unavailable ids skipped); remaining slots use algorithmic rank.
 */
export function getHomepageToolDeals(
  tools: AiTool[],
  settings: ToolsSettings,
  now = Date.now(),
): AiTool[] {
  if (!settings.homepageDealsEnabled) return [];

  const max = Math.max(0, settings.homepageMaxDeals);
  if (max === 0) return [];

  const eligible = tools.filter((tool) =>
    isEligibleHomepageDeal(tool, settings, now),
  );
  if (eligible.length === 0) return [];

  const byId = new Map(eligible.map((t) => [t.id, t]));
  const pinnedIds = Array.isArray(settings.homepageDealToolIds)
    ? settings.homepageDealToolIds
    : [];
  const picked: AiTool[] = [];
  const seen = new Set<string>();

  for (const id of pinnedIds) {
    if (typeof id !== "string" || !id.trim()) continue;
    if (seen.has(id)) continue;
    const tool = byId.get(id);
    if (!tool) continue;
    seen.add(id);
    picked.push(tool);
    if (picked.length >= max) return picked;
  }

  const ranked = algorithmicRank(
    eligible.filter((t) => !seen.has(t.id)),
    settings,
  );
  for (const tool of ranked) {
    if (seen.has(tool.id)) continue;
    seen.add(tool.id);
    picked.push(tool);
    if (picked.length >= max) break;
  }

  return picked;
}
