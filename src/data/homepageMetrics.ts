/**
 * Homepage marketplace metrics.
 *
 * `source: "live"` metrics are derived from the public catalog at render time.
 * `source: "placeholder"` metrics MUST be replaced with verified analytics
 * before launch — never present them as confirmed PRAGVI achievements.
 */

export type HomepageMetricDefinition = {
  id: string;
  label: string;
  /** Static display value when not live-derived. */
  value?: string;
  /**
   * live = compute from catalog counts
   * placeholder = needs verified analytics before launch
   */
  source: "live" | "placeholder";
  liveKey?: "videos" | "products" | "collections" | "bundles" | "images" | "prompts";
  /** Shown under placeholder metrics so launch copy stays honest. */
  note?: string;
};

export const HOMEPAGE_METRICS: HomepageMetricDefinition[] = [
  {
    id: "videos",
    label: "AI dance videos",
    source: "live",
    liveKey: "videos",
  },
  {
    id: "products",
    label: "Marketplace products",
    source: "live",
    liveKey: "products",
  },
  {
    id: "collections",
    label: "Curated collections",
    source: "live",
    liveKey: "collections",
  },
  {
    id: "bundles",
    label: "Creator bundles",
    source: "live",
    liveKey: "bundles",
  },
  {
    id: "views",
    label: "Views generated",
    value: "—",
    source: "placeholder",
    note: "Replace with verified analytics before launch (e.g. aggregate social views).",
  },
  {
    id: "sold",
    label: "Videos sold",
    value: "—",
    source: "placeholder",
    note: "Replace with verified order/entitlement totals before launch.",
  },
];

export type LiveMetricCounts = {
  videos: number;
  products: number;
  collections: number;
  bundles: number;
  images: number;
  prompts: number;
};

export function formatLiveCount(n: number): string {
  if (n <= 0) return "0";
  if (n < 1000) return `${n}+`;
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${Math.round(n / 1000)}K+`;
}
