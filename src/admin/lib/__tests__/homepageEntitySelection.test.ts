import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendUniqueIds,
  dedupePreserveOrder,
  removeSelectedId,
  reorderSelectedId,
  setSingleSelectedId,
} from "@/admin/lib/homepageEntitySelection";
import {
  resolveCuratedById,
  resolveFeaturedSelection,
} from "@/catalog/homepageConfig";

describe("homepageEntitySelection", () => {
  it("appends without duplicates and preserves order", () => {
    assert.deepEqual(appendUniqueIds(["a", "b"], ["b", "c", "a", "d"]), [
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("removes a selected id without touching others", () => {
    assert.deepEqual(removeSelectedId(["a", "missing", "b"], "a"), [
      "missing",
      "b",
    ]);
  });

  it("reorders by drag target index", () => {
    assert.deepEqual(reorderSelectedId(["a", "b", "c", "d"], "d", "b"), [
      "a",
      "d",
      "b",
      "c",
    ]);
    assert.deepEqual(reorderSelectedId(["a", "b"], "x", "a"), ["a", "b"]);
  });

  it("supports single-select clear and set", () => {
    assert.deepEqual(setSingleSelectedId(""), []);
    assert.deepEqual(setSingleSelectedId(null), []);
    assert.deepEqual(setSingleSelectedId("vid-1"), ["vid-1"]);
  });

  it("dedupes while preserving first occurrence", () => {
    assert.deepEqual(dedupePreserveOrder(["a", "b", "a", "c", "b"]), [
      "a",
      "b",
      "c",
    ]);
  });

  it("type-filter compatibility: curated lists stay id-only contracts", () => {
    const products = [
      { id: "v1", productType: "VIDEO" as const },
      { id: "i1", productType: "AI_IMAGE" as const },
    ];
    const curated = appendUniqueIds([], ["v1", "v1", "missing-old"]);
    assert.deepEqual(curated, ["v1", "missing-old"]);
    // Unavailable ids remain in the CMS array (admin shelf); storefront
    // resolve helpers still skip missing entities.
    const resolved = resolveCuratedById(
      products,
      curated,
      products,
      10,
    );
    assert.deepEqual(
      resolved.map((p) => p.id),
      ["v1"],
    );
  });

  it("empty selection keeps automatic fallback contract", () => {
    const all = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const featured = resolveFeaturedSelection(all, [], all, 2);
    assert.deepEqual(
      featured.map((p) => p.id),
      ["a", "b"],
    );
    const curated = resolveCuratedById(all, undefined, all, 2);
    assert.deepEqual(
      curated.map((p) => p.id),
      ["a", "b"],
    );
  });
});
