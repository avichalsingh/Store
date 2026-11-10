import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterAdminProductsInStorefrontCatalog,
  isStorefrontCatalogProductId,
  mapStorefrontCatalogPickProducts,
  storefrontProductIdSet,
} from "@/catalog/storefrontCatalogPresence";

describe("storefrontCatalogPresence", () => {
  it("builds an id set from catalog products and ignores blanks", () => {
    const ids = storefrontProductIdSet([
      { id: "dummy-image-01" },
      { id: "  " },
      { id: null },
      {},
      { id: "dummy-video-03" },
    ]);
    assert.equal(ids.has("dummy-image-01"), true);
    assert.equal(ids.has("dummy-video-03"), true);
    assert.equal(ids.size, 2);
  });

  it("marks seed-only homepage collage ids as missing from the live catalog", () => {
    const live = storefrontProductIdSet([
      { id: "dummy-image-01" },
      { id: "dummy-video-03" },
    ]);
    // Published revision 4 used these admin-seed ids; they are not on staging catalog.
    assert.equal(
      isStorefrontCatalogProductId("prod-image-001", live),
      false,
    );
    assert.equal(isStorefrontCatalogProductId("vid-016", live), false);
    assert.equal(
      isStorefrontCatalogProductId("dummy-video-03", live),
      true,
    );
  });

  it("maps /api/catalog products into picker rows using storefront titles", () => {
    const picks = mapStorefrontCatalogPickProducts([
      {
        id: "dummy-image-01",
        title: "Pastel Studio Portrait",
        productType: "AI_IMAGE",
        thumbnail: "https://example.com/a.jpg",
      },
      {
        id: "dummy-video-03",
        title: "Quiet Flex Loop",
        productType: "VIDEO",
        thumbnail: "https://example.com/b.jpg",
      },
      {
        id: "broken",
        title: "Nope",
        productType: "NOT_A_TYPE",
      },
      {
        id: "prod-image-001",
        name: "Cute Indian Cartoon Girl",
        productType: "AI_IMAGE",
      },
    ]);
    assert.deepEqual(
      picks.map((p) => p.id),
      ["dummy-image-01", "dummy-video-03", "prod-image-001"],
    );
    assert.equal(picks[0]?.name, "Pastel Studio Portrait");
    assert.equal(picks[1]?.name, "Quiet Flex Loop");
  });

  it("fails closed while catalog ids are unknown, then filters admin products", () => {
    const admin = [
      { id: "prod-image-001", name: "Cute Indian Cartoon Girl" },
      { id: "dummy-image-01", name: "Live image" },
      { id: "vid-016", name: "Quiet Flex" },
      { id: "dummy-video-03", name: "Quiet Flex Loop" },
    ];
    assert.deepEqual(
      filterAdminProductsInStorefrontCatalog(admin, null),
      [],
    );
    const live = storefrontProductIdSet([
      { id: "dummy-image-01" },
      { id: "dummy-video-03" },
    ]);
    assert.deepEqual(
      filterAdminProductsInStorefrontCatalog(admin, live).map((p) => p.id),
      ["dummy-image-01", "dummy-video-03"],
    );
  });
});
