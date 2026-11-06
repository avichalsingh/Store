import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CATALOG_REMOTE_PUBLISH_ENV,
  catalogPublishUserMessage,
  catalogRemotePublishGatedMessage,
  isCatalogRemotePublishEnabled,
} from "@/catalog/catalogRemotePublish";

describe("catalogPublishUserMessage", () => {
  it("distinguishes dry-run publish from real Supabase publish", () => {
    assert.match(
      catalogPublishUserMessage("Product", "active", true),
      /dry-run/,
    );
    assert.match(
      catalogPublishUserMessage("Product", "active", true),
      new RegExp(CATALOG_REMOTE_PUBLISH_ENV),
    );
    assert.equal(
      catalogPublishUserMessage("Product", "active", false),
      "Product published to Supabase catalog",
    );
  });

  it("distinguishes dry-run unpublish from real unpublish", () => {
    assert.match(
      catalogPublishUserMessage("Product", "archived", true),
      /unpublish dry-run/,
    );
    assert.equal(
      catalogPublishUserMessage("Collection", "draft", false),
      "Collection unpublished from Supabase catalog (status: draft)",
    );
  });

  it("gate helper stays disabled by default", () => {
    assert.equal(isCatalogRemotePublishEnabled({}), false);
    assert.match(
      catalogRemotePublishGatedMessage("Product"),
      /Remote upsert skipped/,
    );
  });
});
