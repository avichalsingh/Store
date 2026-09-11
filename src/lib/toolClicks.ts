import type { AffiliateClick } from "@/catalog/tools/types";

const STORAGE_KEY = "rhythm-tool-clicks-v1";

function readClicks(): AffiliateClick[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AffiliateClick[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeClicks(clicks: AffiliateClick[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  } catch {
    // ignore quota / private mode
  }
}

export function getToolClicks(): AffiliateClick[] {
  return readClicks();
}

export function recordToolClick(
  click: Omit<AffiliateClick, "id" | "clickedAt"> & {
    id?: string;
    clickedAt?: string;
  },
): AffiliateClick {
  const entry: AffiliateClick = {
    id: click.id ?? `click-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    toolId: click.toolId,
    toolName: click.toolName,
    clickedAt: click.clickedAt ?? new Date().toISOString(),
    source: click.source,
    destinationUrl: click.destinationUrl,
  };
  const next = [entry, ...readClicks()].slice(0, 500);
  writeClicks(next);
  return entry;
}
