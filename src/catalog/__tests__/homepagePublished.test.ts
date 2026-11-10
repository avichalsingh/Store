import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APPROVED_HOMEPAGE_HERO_HEADLINE,
  DEFAULT_HOMEPAGE_HERO,
  DEFAULT_HOMEPAGE_SECTIONS,
  toHomepageConfigDocument,
} from "@/catalog/homepageConfig";
import {
  isRawPublishedHomepageEmpty,
  normalizeHomepageConfigDocument,
  parsePublishedHomepageDocument,
} from "@/catalog/homepagePublished";
import {
  decideHomepagePublish,
  resolveHomepageConfigSource,
} from "@/catalog/homepagePublishGate";
import {
  HOMEPAGE_REMOTE_PUBLISH_ENV,
  homepageRemotePublishGatedMessage,
  isHomepageRemotePublishEnabled,
} from "@/catalog/homepageRemotePublish";

describe("homepage published document validation", () => {
  it("treats null, empty object, and non-objects as unpublished", () => {
    assert.equal(isRawPublishedHomepageEmpty(null), true);
    assert.equal(isRawPublishedHomepageEmpty(undefined), true);
    assert.equal(isRawPublishedHomepageEmpty({}), true);
    assert.equal(isRawPublishedHomepageEmpty([]), true);
    assert.equal(isRawPublishedHomepageEmpty("x"), true);
    assert.equal(parsePublishedHomepageDocument({}), null);
  });

  it("normalizes a valid HomepageConfigDocument", () => {
    const doc = toHomepageConfigDocument(
      DEFAULT_HOMEPAGE_SECTIONS,
      DEFAULT_HOMEPAGE_HERO,
    );
    const normalized = normalizeHomepageConfigDocument(doc);
    assert.equal(normalized.version, 1);
    assert.ok(normalized.sections.length > 0);
    assert.equal(normalized.hero.headline, APPROVED_HOMEPAGE_HERO_HEADLINE);
    assert.equal(parsePublishedHomepageDocument(doc)?.version, 1);
  });

  it("does not invent published status from sparse junk without sections/hero", () => {
    assert.equal(isRawPublishedHomepageEmpty({ version: 1 }), true);
    assert.equal(parsePublishedHomepageDocument({ version: 1 }), null);
  });
});

describe("homepage remote publish gate", () => {
  it("defaults to disabled and stays independent of CATALOG_REMOTE_PUBLISH", () => {
    assert.equal(isHomepageRemotePublishEnabled({}), false);
    assert.equal(
      isHomepageRemotePublishEnabled({ CATALOG_REMOTE_PUBLISH: "true" }),
      false,
    );
    assert.equal(
      isHomepageRemotePublishEnabled({ [HOMEPAGE_REMOTE_PUBLISH_ENV]: "true" }),
      true,
    );
    assert.match(homepageRemotePublishGatedMessage(), /HOMEPAGE_REMOTE_PUBLISH/);
  });

  it("gate-off dry-run never requires DB credentials and skips conflict", () => {
    const decision = decideHomepagePublish({
      rawDocument: toHomepageConfigDocument(
        DEFAULT_HOMEPAGE_SECTIONS,
        DEFAULT_HOMEPAGE_HERO,
      ),
      expectedPublishedRevision: 3,
      currentPublishedRevision: 99,
      env: {
        SUPABASE_SERVICE_ROLE_KEY: "must-not-be-used",
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      },
    });
    assert.equal(decision.ok, true);
    if (!decision.ok) return;
    assert.equal(decision.dryRun, true);
    assert.match(decision.message, /Remote upsert skipped/);
    assert.equal(decision.document.version, 1);
  });

  it("gate-on reports revision conflicts", () => {
    const decision = decideHomepagePublish({
      rawDocument: { hero: { headline: "X" }, sections: [] },
      expectedPublishedRevision: 1,
      currentPublishedRevision: 2,
      env: { [HOMEPAGE_REMOTE_PUBLISH_ENV]: "true" },
    });
    assert.equal(decision.ok, false);
    if (decision.ok) return;
    assert.equal(decision.status, 409);
    assert.equal(decision.currentPublishedRevision, 2);
    assert.equal(decision.expectedPublishedRevision, 1);
  });

  it("gate-on advances revision when expected matches", () => {
    const decision = decideHomepagePublish({
      rawDocument: toHomepageConfigDocument(
        DEFAULT_HOMEPAGE_SECTIONS,
        DEFAULT_HOMEPAGE_HERO,
      ),
      expectedPublishedRevision: 4,
      currentPublishedRevision: 4,
      env: { [HOMEPAGE_REMOTE_PUBLISH_ENV]: "true" },
    });
    assert.equal(decision.ok, true);
    if (!decision.ok || decision.dryRun) {
      assert.fail("expected ready-to-write decision");
    }
    assert.equal(decision.nextPublishedRevision, 5);
    assert.equal(decision.currentPublishedRevision, 4);
  });
});

describe("homepage storefront source resolution", () => {
  it("prefers published when available and preview draft is off", () => {
    assert.equal(
      resolveHomepageConfigSource({
        previewDraft: false,
        publishedLoaded: true,
        publishedAvailable: true,
      }),
      "published",
    );
  });

  it("uses draft preview when explicitly enabled", () => {
    assert.equal(
      resolveHomepageConfigSource({
        previewDraft: true,
        publishedLoaded: true,
        publishedAvailable: true,
      }),
      "draft-preview",
    );
  });

  it("falls back when unpublished or fetch not ready", () => {
    assert.equal(
      resolveHomepageConfigSource({
        previewDraft: false,
        publishedLoaded: true,
        publishedAvailable: false,
      }),
      "local-fallback",
    );
    assert.equal(
      resolveHomepageConfigSource({
        previewDraft: false,
        publishedLoaded: false,
        publishedAvailable: false,
      }),
      "local-fallback",
    );
  });
});
