"use client";

import { AddContentModal } from "@/admin/components/collections/AddContentModal";
import { CollectionContentGrid } from "@/admin/components/collections/CollectionContentGrid";
import { CollectionCoverBuilder } from "@/admin/components/collections/CollectionCoverBuilder";
import { CollectionLivePreview } from "@/admin/components/collections/CollectionLivePreview";
import { CollectionOrderList } from "@/admin/components/collections/CollectionOrderList";
import { CollectionPricingSection } from "@/admin/components/collections/CollectionPricingSection";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  applyCharacterRules,
  normalizeCollection,
  resolveCollectionCoverUrl,
  sortCollectionProducts,
} from "@/admin/lib/collectionCover";
import { formatDateTime, formatInr, formatUsd, slugify, uid } from "@/admin/lib/format";
import { collectionHasPricing } from "@/admin/lib/collectionPricing";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCollection } from "@/admin/types";
import {
  Check,
  ChevronRight,
  Copy,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

function blankCollection(): AdminCollection {
  const stamp = new Date().toISOString();
  return normalizeCollection({
    id: uid("col"),
    name: "",
    slug: "",
    description: "",
    coverImage: "/media/collections/viral-moves-vol-01.jpg",
    coverMode: "auto",
    coverAutoSource: "first",
    productIds: [],
    characterRules: [],
    sortMode: "custom",
    pricing: {
      INR: { regularPrice: 1499, currentPrice: 999 },
      USD: { regularPrice: 18.99, currentPrice: 12.99 },
    },
    offer: { enabled: false, label: "" },
    status: "draft",
    featured: false,
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export function CollectionEditor({
  collectionId,
  isNew,
}: {
  collectionId?: string;
  isNew?: boolean;
}) {
  const router = useRouter();
  const {
    collections,
    products,
    characters,
    mediaAssets,
    upsertCollection,
    duplicateCollection,
    deleteCollection,
    hydrated,
  } = useAdmin();

  const existing = useMemo(() => {
    if (isNew || !collectionId) return undefined;
    return collections.find(
      (c) => c.id === collectionId || c.slug === collectionId,
    );
  }, [collections, collectionId, isNew]);

  const [draft, setDraft] = useState<AdminCollection | null>(null);
  const [baseline, setBaseline] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isNew && collectionId && !existing) return;
    const initial = existing
      ? normalizeCollection(structuredClone(existing))
      : blankCollection();
    setDraft(initial);
    setBaseline(JSON.stringify(initial));
    setSlugTouched(!!existing?.slug);
    setSavedAt(existing?.updatedAt ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, collectionId, isNew]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  const orderedIds = useMemo(() => {
    if (!draft) return [];
    const merged = applyCharacterRules(draft, products);
    return sortCollectionProducts(merged, products, draft.sortMode);
  }, [draft, products]);

  const uniqueCharacters = useMemo(() => {
    if (!draft) return 0;
    const set = new Set<string>();
    for (const id of draft.productIds) {
      const p = products.find((x) => x.id === id);
      if (p?.characterId) set.add(p.characterId);
    }
    return set.size;
  }, [draft, products]);

  const coverSummary = useMemo(() => {
    if (!draft) return "";
    switch (draft.coverMode) {
      case "auto":
        return `Auto (${draft.coverAutoSource ?? "first"})`;
      case "single":
        return "Single video";
      case "collage":
        return `Collage · ${draft.coverLayout ?? "four-grid"}`;
      case "custom":
        return "Custom upload";
      default:
        return draft.coverMode;
    }
  }, [draft]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const confirmLeave = () => {
    if (!dirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave this page and discard them?",
    );
  };

  if (!hydrated || !draft) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  if (!isNew && collectionId && !existing) {
    return (
      <p className="text-sm text-[var(--admin-danger)]">Collection not found.</p>
    );
  }

  const patch = (partial: Partial<AdminCollection>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  };

  const prepareSave = (asDraft: boolean): AdminCollection => {
    const productIds =
      draft.sortMode === "custom"
        ? draft.productIds
        : sortCollectionProducts(draft.productIds, products, draft.sortMode);
    const next = normalizeCollection({
      ...draft,
      productIds,
      status: asDraft ? "draft" : draft.status,
      slug: draft.slug || slugify(draft.name) || `collection-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
    next.coverImage = resolveCollectionCoverUrl(next, products, mediaAssets);
    return next;
  };

  const save = (asDraft: boolean) => {
    const saved = prepareSave(asDraft);
    upsertCollection(saved, asDraft ? "Draft saved" : "Collection saved");
    setDraft(saved);
    setBaseline(JSON.stringify(saved));
    setSavedAt(saved.updatedAt);
    if (isNew) {
      router.replace(`/admin/collections/${saved.id}`);
    }
  };

  const addProducts = (ids: string[]) => {
    const next = [...draft.productIds];
    for (const id of ids) {
      if (!next.includes(id)) next.push(id);
    }
    patch({ productIds: next });
  };

  const gridIds =
    draft.sortMode === "custom" ? draft.productIds : orderedIds;

  return (
    <div className="pb-16">
      <nav className="mb-3 flex items-center gap-1 text-xs text-[var(--admin-muted)]">
        <Link
          href="/admin/collections"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
          className="hover:text-[var(--admin-text)]"
        >
          Collections
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--admin-text)]">
          {draft.name || "New Collection"}
        </span>
      </nav>

      <AdminPageHeader
        title={isNew || !existing ? "New Collection" : "Edit Collection"}
        description="Organize products, build the collection cover and control how this collection appears in the store."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {dirty ? (
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                Unsaved changes
              </span>
            ) : savedAt ? (
              <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--admin-success)]">
                <Check className="h-3.5 w-3.5" />
                All changes saved
              </span>
            ) : null}
            <AdminButton variant="secondary" onClick={() => save(true)}>
              Save Draft
            </AdminButton>
            <AdminButton variant="primary" onClick={() => save(false)}>
              Save Changes
            </AdminButton>
            {!isNew && existing ? (
              <div className="relative" ref={moreRef}>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  aria-label="More actions"
                  onClick={() => setMoreOpen((o) => !o)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </AdminButton>
                {moreOpen ? (
                  <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] py-1 shadow-[var(--admin-shadow-md)]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--admin-surface-2)]"
                      onClick={() => {
                        const copy = duplicateCollection(draft.id);
                        setMoreOpen(false);
                        if (copy) router.push(`/admin/collections/${copy.id}`);
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--admin-surface-2)]"
                      onClick={() => {
                        const status =
                          draft.status === "active" ? "draft" : "active";
                        patch({ status });
                        setMoreOpen(false);
                      }}
                    >
                      {draft.status === "active" ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)]"
                      onClick={() => {
                        setMoreOpen(false);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Collection Details
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Name, slug, and how this collection is labeled in the store.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField
                label="Collection Name"
                hint="Shown on the storefront and in admin lists."
              >
                <AdminInput
                  value={draft.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    patch({
                      name,
                      slug: slugTouched ? draft.slug : slugify(name),
                    });
                  }}
                  placeholder="Viral Moves Collection"
                />
              </AdminField>
              <AdminField label="Slug" hint="URL-safe identifier.">
                <AdminInput
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    patch({ slug: e.target.value });
                  }}
                  placeholder="viral-moves-collection"
                />
              </AdminField>
              <AdminField label="Status">
                <AdminSelect
                  value={draft.status}
                  onChange={(e) =>
                    patch({
                      status: e.target.value as AdminCollection["status"],
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </AdminSelect>
              </AdminField>
              <div className="flex items-end pb-2">
                <AdminToggle
                  checked={draft.featured}
                  onChange={(featured) => patch({ featured })}
                  label="Featured"
                />
              </div>
              <AdminField
                label="Description"
                className="md:col-span-2"
                hint="Short supporting copy for collection pages."
              >
                <AdminTextarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="The dances people can't stop looping. High-impact vertical routines engineered for short-form feeds."
                />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
                  Collection Content
                </h2>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  {draft.productIds.length} item
                  {draft.productIds.length === 1 ? "" : "s"} selected
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Content
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patch({ productIds: products.map((p) => p.id) })
                  }
                >
                  Select All
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => patch({ productIds: [] })}
                >
                  Clear Selection
                </AdminButton>
              </div>
            </div>
            <CollectionContentGrid
              productIds={gridIds}
              products={products}
              characters={characters}
              disabled={draft.sortMode !== "custom"}
              onAddContent={() => setAddOpen(true)}
              onReorder={(productIds) =>
                patch({ productIds, sortMode: "custom" })
              }
              onRemove={(id) =>
                patch({
                  productIds: draft.productIds.filter((x) => x !== id),
                  coverSlots: (draft.coverSlots ?? []).map((s) =>
                    s.productId === id ? { ...s, productId: undefined } : s,
                  ),
                  coverProductId:
                    draft.coverProductId === id
                      ? undefined
                      : draft.coverProductId,
                })
              }
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Collection Cover
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Build how this collection appears as a cover on the store.
            </p>
            <CollectionCoverBuilder
              collection={draft}
              products={products}
              onChange={patch}
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Content Order
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Drag items to control the order they appear in this collection.
            </p>
            <CollectionOrderList
              productIds={gridIds}
              products={products}
              sortMode={draft.sortMode}
              onSortModeChange={(sortMode) => {
                if (sortMode === "custom") {
                  patch({ sortMode });
                } else {
                  patch({
                    sortMode,
                    productIds: sortCollectionProducts(
                      draft.productIds,
                      products,
                      sortMode,
                    ),
                  });
                }
              }}
              onReorder={(productIds) =>
                patch({ productIds, sortMode: "custom" })
              }
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Pricing &amp; Offer
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Set collection pricing for India and global markets. Leave prices at
              0 for an unpriced collection.
            </p>
            <CollectionPricingSection collection={draft} onChange={patch} />
          </AdminCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <AdminCard>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Collection Status
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Status</dt>
                <dd className="inline-flex items-center gap-1.5 capitalize">
                  <span
                    className={
                      draft.status === "active"
                        ? "h-1.5 w-1.5 rounded-full bg-[var(--admin-success)]"
                        : "h-1.5 w-1.5 rounded-full bg-[var(--admin-muted)]"
                    }
                  />
                  {draft.status}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Featured</dt>
                <dd>{draft.featured ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Products</dt>
                <dd>{draft.productIds.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Characters</dt>
                <dd>{uniqueCharacters}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Cover</dt>
                <dd className="text-right text-xs">{coverSummary}</dd>
              </div>
              {collectionHasPricing(draft.pricing) ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--admin-muted)]">Price</dt>
                  <dd className="text-right text-xs">
                    {formatInr(draft.pricing!.INR.currentPrice)}
                    <br />
                    {formatUsd(draft.pricing!.USD.currentPrice)}
                  </dd>
                </div>
              ) : null}
            </dl>
          </AdminCard>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Live Preview
            </h3>
            <CollectionLivePreview collection={draft} products={products} />
          </div>

          <AdminCard>
            <p className="text-xs text-[var(--admin-muted)]">
              {dirty ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-accent)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
                  Unsaved changes
                </span>
              ) : savedAt ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-success)]">
                  <Check className="h-3.5 w-3.5" />
                  Last saved {formatDateTime(savedAt)}
                </span>
              ) : (
                "Not saved yet"
              )}
            </p>
          </AdminCard>
        </aside>
      </div>

      <AddContentModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        products={products}
        characters={characters}
        collection={draft}
        onAddProducts={addProducts}
        onUpdateRules={(characterRules) => {
          const withRules = { ...draft, characterRules };
          const merged = applyCharacterRules(withRules, products);
          patch({ characterRules, productIds: merged });
        }}
      />

      <AdminConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        danger
        title={`Delete "${draft.name || "Collection"}"?`}
        description="This will remove the collection but will not delete the products inside it."
        confirmLabel="Delete Collection"
        onConfirm={() => {
          deleteCollection(draft.id);
          router.push("/admin/collections");
        }}
      />
    </div>
  );
}
