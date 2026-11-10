/**
 * Public / storefront performance helpers.
 * Demo overlays must never present as verified merchandising metrics.
 */

import type { CreatorActivity, ProductPerformance } from "@/types";

/**
 * No live analytics pipeline is wired to the storefront yet. CMS rows labeled
 * `manual` / `verified` can still be seed catalogue numbers — keep public
 * merchandising metrics suppressed until real verified analytics are connected.
 */
export const PUBLIC_MERCHANDISING_METRICS_ENABLED = false;

export function isPublishablePerformanceMode(
  mode: string | undefined | null,
): boolean {
  return mode === "manual" || mode === "verified";
}

/**
 * Strip demo / empty / unverified performance from public catalog surfaces.
 * Returns undefined when metrics should not render on the storefront.
 */
export function publicPerformance(
  performance: ProductPerformance | null | undefined,
): ProductPerformance | undefined {
  if (!PUBLIC_MERCHANDISING_METRICS_ENABLED) return undefined;
  if (!performance) return undefined;
  // Demo / missing mode never ships as storefront merchandising metrics.
  if (!isPublishablePerformanceMode(performance.mode)) return undefined;
  if (
    typeof performance.primaryMetric !== "string" ||
    !performance.primaryMetric.trim()
  ) {
    return undefined;
  }
  return performance;
}

/** Same gate for creator-activity FOMO counters. */
export function publicCreatorActivity(
  activity: CreatorActivity | null | undefined,
): CreatorActivity | undefined {
  if (!PUBLIC_MERCHANDISING_METRICS_ENABLED) return undefined;
  if (!activity) return undefined;
  if (!isPublishablePerformanceMode(activity.mode)) return undefined;
  return activity;
}

/**
 * Merge CMS-mapped performance with optional seed/demo fallback.
 * Storefront / published path: allowDemoFallback=false (default).
 */
export function mergePublicPerformance(
  cms: ProductPerformance | undefined,
  fallback: ProductPerformance | undefined,
  options: { allowDemoFallback?: boolean } = {},
): ProductPerformance | undefined {
  const allowDemo = options.allowDemoFallback === true;

  // Always run the public gate first (respects KYC kill-switch).
  const publishableCms = publicPerformance(cms);
  if (publishableCms) return publishableCms;

  if (!allowDemo) {
    return undefined;
  }

  // Dev/static seed path only: prefer CMS fields, fill gaps from demo seed.
  if (!cms && !fallback) return undefined;
  if (!cms) return fallback;
  if (!fallback) return cms;
  return {
    ...fallback,
    ...cms,
    primaryLabel: cms.primaryLabel || fallback.primaryLabel,
    insight: cms.insight || fallback.insight,
    badge: cms.badge || fallback.badge,
    supportingText: cms.supportingText || fallback.supportingText,
    momentumLabel: cms.momentumLabel || fallback.momentumLabel,
    engagementText: cms.engagementText || fallback.engagementText,
    aboveAverage: cms.aboveAverage || fallback.aboveAverage,
    mode: cms.mode ?? fallback.mode,
  };
}
