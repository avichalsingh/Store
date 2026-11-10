import type { HomepageConfigDocument } from "@/admin/types";
import { normalizeHomepageConfigDocument } from "@/catalog/homepagePublished";
import {
  homepageRemotePublishGatedMessage,
  isHomepageRemotePublishEnabled,
} from "@/catalog/homepageRemotePublish";

export type HomepagePublishConflict = {
  ok: false;
  status: 409;
  currentPublishedRevision: number;
  expectedPublishedRevision: number;
  error: string;
};

export type HomepagePublishDryRun = {
  ok: true;
  dryRun: true;
  document: HomepageConfigDocument;
  publishedRevision: number;
  message: string;
};

export type HomepagePublishReady = {
  ok: true;
  dryRun: false;
  document: HomepageConfigDocument;
  currentPublishedRevision: number;
  nextPublishedRevision: number;
};

export type HomepagePublishDecision =
  | HomepagePublishConflict
  | HomepagePublishDryRun
  | HomepagePublishReady;

/**
 * Pure publish decision: normalize document, gate dry-run, revision conflict.
 * Remote write remains in the API route (service-role client).
 *
 * Gate OFF → dry-run only (no conflict check; no DB).
 * Gate ON → conflict check against currentPublishedRevision, then ready to write.
 */
export function decideHomepagePublish(input: {
  rawDocument: unknown;
  expectedPublishedRevision?: number;
  currentPublishedRevision?: number;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): HomepagePublishDecision {
  const document = normalizeHomepageConfigDocument(input.rawDocument);
  const env = input.env ?? {};

  if (!isHomepageRemotePublishEnabled(env)) {
    return {
      ok: true,
      dryRun: true,
      document,
      publishedRevision:
        input.expectedPublishedRevision ??
        Math.max(0, Math.floor(input.currentPublishedRevision || 0)),
      message: homepageRemotePublishGatedMessage(),
    };
  }

  const current = Math.max(0, Math.floor(input.currentPublishedRevision || 0));
  const expected = input.expectedPublishedRevision;

  if (expected !== undefined && expected !== current) {
    return {
      ok: false,
      status: 409,
      currentPublishedRevision: current,
      expectedPublishedRevision: expected,
      error: "Homepage publish conflict: revision mismatch",
    };
  }

  return {
    ok: true,
    dryRun: false,
    document,
    currentPublishedRevision: current,
    nextPublishedRevision: current + 1,
  };
}

/**
 * Resolve storefront homepage source without React.
 * Mirrors useHomepageConfig selection rules for tests.
 */
export function resolveHomepageConfigSource(input: {
  previewDraft: boolean;
  publishedLoaded: boolean;
  publishedAvailable: boolean;
}): "published" | "draft-preview" | "local-fallback" {
  if (input.previewDraft) return "draft-preview";
  if (input.publishedLoaded && input.publishedAvailable) return "published";
  return "local-fallback";
}
