import type { AiImageProductPublic } from "@/types";
import type { DealPath } from "@/components/products/image-pdp/ImageBuildYourDeal";

export type DealGalleryItem = {
  id: string;
  src: string;
  title?: string;
};

export type DealGalleryState = {
  items: DealGalleryItem[];
  label: string;
  mode: "selected" | "collection";
};

export type CatalogLike = {
  getProductById: (id: string) => unknown;
  getProductsByType: (type: string) => AiImageProductPublic[];
};

export function getCollectionId(product: AiImageProductPublic) {
  return (
    product.imageCollection?.id ??
    product.packUpgrade?.collectionId ??
    undefined
  );
}

export function getCollectionMemberProducts(
  catalog: CatalogLike,
  product: AiImageProductPublic,
): AiImageProductPublic[] {
  const colId = getCollectionId(product);
  if (!colId) return [];

  return catalog
    .getProductsByType("AI_IMAGE")
    .filter((p) => {
      // Exclude pack SKUs — members are individual single-image products
      if (p.slug.endsWith("-collection")) return false;
      const pid = getCollectionId(p);
      return pid === colId;
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function resolveDealGallery(
  dealPath: DealPath | null,
  selectedIds: string[],
  product: AiImageProductPublic,
  catalog: CatalogLike,
): DealGalleryState {
  if (dealPath === "collection") {
    const previews =
      product.imageCollection?.previewImages ??
      product.packUpgrade?.previewImages ??
      [];
    const items = previews
      .filter(Boolean)
      .map((src, i) => ({
        id: `collection-${i}`,
        src,
        title: `${product.imageCollection?.name ?? product.title} — ${i + 1}`,
      }));

    return {
      items,
      label: `FULL COLLECTION · ${items.length} IMAGES`,
      mode: "collection",
    };
  }

  const items = selectedIds
    .map((id) => {
      const p = catalog.getProductById(id) as AiImageProductPublic | undefined;
      if (!p || p.productType !== "AI_IMAGE") return null;
      const src = p.previewImages?.[0] ?? p.thumbnail;
      if (!src) return null;
      return { id, src, title: p.title };
    })
    .filter(Boolean) as DealGalleryItem[];

  const count = items.length || 1;
  return {
    items: items.length ? items : fallbackSingle(product),
    label: `YOUR IMAGES · ${count} SELECTED`,
    mode: "selected",
  };
}

function fallbackSingle(product: AiImageProductPublic): DealGalleryItem[] {
  const src = product.previewImages?.[0] ?? product.thumbnail;
  if (!src) return [];
  return [{ id: product.id, src, title: product.title }];
}

export function isProductInDeal(
  productId: string,
  dealPath: DealPath | null,
  selectedIds: string[],
  collectionProductIds: string[],
): boolean {
  if (dealPath === "collection") {
    return collectionProductIds.includes(productId);
  }
  return selectedIds.includes(productId);
}
