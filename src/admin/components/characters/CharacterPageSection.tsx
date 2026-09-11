"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { resolveCollectionCoverUrl } from "@/admin/lib/collectionCover";
import type {
  AdminCharacter,
  AdminCollection,
  AdminProduct,
} from "@/admin/types";
import { Check } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function CharacterPageSection({
  draft,
  products,
  collections,
  onChange,
}: {
  draft: AdminCharacter;
  products: AdminProduct[];
  collections: AdminCollection[];
  onChange: (partial: Partial<AdminCharacter>) => void;
}) {
  const [productPicker, setProductPicker] = useState(false);
  const [collectionPicker, setCollectionPicker] = useState(false);

  const featuredProduct = products.find((p) => p.id === draft.featuredProductId);
  const featuredCollection = collections.find(
    (c) => c.id === draft.featuredCollectionId,
  );

  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
        Character Page
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Control the public-facing character page and characters index.
      </p>

      <div className="space-y-4">
        <AdminField label="Page headline">
          <AdminInput
            value={draft.pageHeadline ?? ""}
            onChange={(e) => onChange({ pageHeadline: e.target.value })}
            placeholder={`Meet ${draft.name || "…"}`}
          />
        </AdminField>
        <AdminField label="Intro / tagline">
          <AdminTextarea
            value={draft.pageIntro ?? ""}
            onChange={(e) => onChange({ pageIntro: e.target.value })}
            placeholder={draft.shortBio || "Short intro for the character page"}
          />
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--admin-border)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--admin-muted)]">
              Featured product
            </p>
            {featuredProduct ? (
              <div className="mb-2 flex items-center gap-2">
                <div className="relative h-12 w-9 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                  <Image
                    src={
                      featuredProduct.media.thumbnail ||
                      "/media/videos/pulse-drop.jpg"
                    }
                    alt=""
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {featuredProduct.name}
                </p>
              </div>
            ) : (
              <p className="mb-2 text-xs text-[var(--admin-muted)]">None selected</p>
            )}
            <div className="flex flex-wrap gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                disabled={!products.length}
                onClick={() => setProductPicker(true)}
              >
                {featuredProduct ? "Change" : "Choose"}
              </AdminButton>
              {featuredProduct ? (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ featuredProductId: undefined })}
                >
                  Clear
                </AdminButton>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] p-3">
            <p className="mb-2 text-xs font-medium text-[var(--admin-muted)]">
              Featured collection
            </p>
            {featuredCollection ? (
              <div className="mb-2 flex items-center gap-2">
                <div className="relative h-12 w-16 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                  <Image
                    src={resolveCollectionCoverUrl(featuredCollection, products)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {featuredCollection.name}
                </p>
              </div>
            ) : (
              <p className="mb-2 text-xs text-[var(--admin-muted)]">None selected</p>
            )}
            <div className="flex flex-wrap gap-2">
              <AdminButton
                variant="secondary"
                size="sm"
                disabled={!collections.length}
                onClick={() => setCollectionPicker(true)}
              >
                {featuredCollection ? "Change" : "Choose"}
              </AdminButton>
              {featuredCollection ? (
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange({ featuredCollectionId: undefined })}
                >
                  Clear
                </AdminButton>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
          <AdminToggle
            checked={draft.showOnCharactersPage}
            onChange={(showOnCharactersPage) =>
              onChange({ showOnCharactersPage })
            }
            label="Show on Characters page"
          />
          <AdminToggle
            checked={draft.featured}
            onChange={(featured) => onChange({ featured })}
            label="Featured character"
          />
          <AdminToggle
            checked={draft.showProductsOnPage ?? true}
            onChange={(showProductsOnPage) => onChange({ showProductsOnPage })}
            label="Show character products on page"
          />
          <AdminToggle
            checked={draft.showCollectionsOnPage ?? true}
            onChange={(showCollectionsOnPage) =>
              onChange({ showCollectionsOnPage })
            }
            label="Show collections featuring this character"
          />
        </div>
      </div>

      <AdminModal
        open={productPicker}
        onClose={() => setProductPicker(false)}
        title="Featured product"
        wide
      >
        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {products.map((p) => {
            const on = draft.featuredProductId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onChange({ featuredProductId: p.id });
                  setProductPicker(false);
                }}
                className={`relative overflow-hidden rounded-xl border text-left ${
                  on
                    ? "border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent-soft)]"
                    : "border-[var(--admin-border)]"
                }`}
              >
                <div className="relative aspect-[9/16] bg-[var(--admin-surface-2)]">
                  <Image
                    src={p.media.thumbnail || "/media/videos/pulse-drop.jpg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="140px"
                  />
                  {on ? (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-accent)] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
                <p className="truncate p-2 text-xs font-medium">{p.name}</p>
              </button>
            );
          })}
        </div>
      </AdminModal>

      <AdminModal
        open={collectionPicker}
        onClose={() => setCollectionPicker(false)}
        title="Featured collection"
        wide
      >
        <div className="grid max-h-[50vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {collections.map((c) => {
            const on = draft.featuredCollectionId === c.id;
            const cover = resolveCollectionCoverUrl(c, products);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange({ featuredCollectionId: c.id });
                  setCollectionPicker(false);
                }}
                className={`overflow-hidden rounded-xl border text-left ${
                  on
                    ? "border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent-soft)]"
                    : "border-[var(--admin-border)]"
                }`}
              >
                <div className="relative h-24 bg-[var(--admin-surface-2)]">
                  <Image
                    src={cover}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="240px"
                  />
                </div>
                <p className="truncate p-2 text-sm font-medium">{c.name}</p>
              </button>
            );
          })}
        </div>
      </AdminModal>
    </div>
  );
}
