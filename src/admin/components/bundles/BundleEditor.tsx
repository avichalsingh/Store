"use client";

import { BundleAddProductsModal } from "@/admin/components/bundles/BundleAddProductsModal";
import { BundleContentGrid } from "@/admin/components/bundles/BundleContentGrid";
import { BundleCoverBuilder } from "@/admin/components/bundles/BundleCoverBuilder";
import { BundleLivePreview } from "@/admin/components/bundles/BundleLivePreview";
import { BundleOrderList } from "@/admin/components/bundles/BundleOrderList";
import { ProductRelationshipsPanel } from "@/admin/components/products/ProductRelationshipsPanel";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import {
  computeBundleTotals,
  getBundleIncludedIds,
  offerCountdown,
  syncBundleIncludes,
} from "@/admin/lib/bundleHelpers";
import {
  applyBundleCoverToProduct,
  bundleCoverSummary,
} from "@/admin/lib/bundleCover";
import {
  discountPct,
  formatDateTime,
  formatInr,
  formatUsd,
  slugify,
  uid,
} from "@/admin/lib/format";
import { normalizeAdminProduct } from "@/admin/lib/normalizeProduct";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import type { BundleData } from "@/catalog/productPayloads";
import { getProductTypeConfig } from "@/catalog/productTypes";
import {
  Check,
  ChevronRight,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function blankBundle(): AdminProduct {
  return normalizeAdminProduct({
    id: uid("bun"),
    name: "",
    slug: "",
    productType: "BUNDLE",
    category: "Bundles",
    shortDescription: "",
    description: "",
    tags: [],
    status: "draft",
    isTrending: false,
    isFeatured: false,
    media: { thumbnail: "" },
    pricing: {
      INR: { regularPrice: 999, currentPrice: 799 },
      USD: { regularPrice: 12.99, currentPrice: 9.99 },
    },
    offer: { enabled: false, label: "", startDate: "", endDate: "" },
    availability: { mode: "unlimited" },
    access: "Instant unlock",
    relationships: [],
    bundleData: { includedProductIds: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export function BundleEditor({
  productId,
  isNew,
}: {
  productId?: string;
  isNew?: boolean;
}) {
  const router = useRouter();
  const { products, upsertProduct, hydrated, mediaAssets } = useAdmin();

  const existing = useMemo(() => {
    if (isNew || !productId) return undefined;
    return products.find(
      (p) =>
        p.id === productId &&
        p.productType === "BUNDLE",
    );
  }, [products, productId, isNew]);

  const [draft, setDraft] = useState<AdminProduct | null>(null);
  const [baseline, setBaseline] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isNew && productId && !existing) return;
    const initial = existing
      ? structuredClone(existing)
      : blankBundle();
    setDraft(initial);
    setBaseline(JSON.stringify(initial));
    setSlugTouched(!!existing?.slug);
    setSavedAt(existing?.updatedAt ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, productId, isNew]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== baseline,
    [draft, baseline],
  );

  const includedIds = useMemo(
    () => (draft ? getBundleIncludedIds(draft) : []),
    [draft],
  );

  const includedProducts = useMemo(
    () =>
      includedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is AdminProduct => Boolean(p)),
    [includedIds, products],
  );

  const totals = useMemo(
    () => (draft ? computeBundleTotals(draft, includedProducts) : null),
    [draft, includedProducts],
  );

  const inrPct = draft
    ? discountPct(draft.pricing.INR.regularPrice, draft.pricing.INR.currentPrice)
    : 0;
  const usdPct = draft
    ? discountPct(draft.pricing.USD.regularPrice, draft.pricing.USD.currentPrice)
    : 0;

  const typeMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of includedProducts) {
      const label = getProductTypeConfig(p.productType).label;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return [...counts.entries()];
  }, [includedProducts]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmLeave = () => {
    if (!dirty) return true;
    return window.confirm(
      "You have unsaved changes. Leave this page and discard them?",
    );
  };

  if (!hydrated || !draft) {
    return <p className="text-sm text-[var(--admin-muted)]">Loading editor…</p>;
  }

  if (!isNew && productId && !existing) {
    return (
      <p className="text-sm text-[var(--admin-danger)]">Bundle not found.</p>
    );
  }

  const patch = (partial: Partial<AdminProduct>) => {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  };

  const setIncluded = (ids: string[]) => {
    setDraft((d) => {
      if (!d) return d;
      const synced = syncBundleIncludes(d, ids);
      return applyBundleCoverToProduct(synced, products, mediaAssets);
    });
  };

  const save = (status?: AdminProduct["status"]) => {
    const withCover = applyBundleCoverToProduct(draft, products, mediaAssets);
    const next = normalizeAdminProduct({
      ...withCover,
      status: status ?? draft.status,
      slug: draft.slug || slugify(draft.name) || `bundle-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    });
    upsertProduct(
      next,
      status === "active" ? "Bundle published" : "Bundle saved",
    );
    setDraft(next);
    setBaseline(JSON.stringify(next));
    setSavedAt(next.updatedAt);
    if (isNew) {
      router.replace(`/admin/bundles/${next.id}`);
    }
  };

  const addProducts = (ids: string[]) => {
    const next = [...includedIds];
    for (const id of ids) {
      if (!next.includes(id)) next.push(id);
    }
    setIncluded(next);
  };

  const handleCoverChange = (bundlePatch: Partial<BundleData>) => {
    setDraft((d) =>
      d ? applyBundleCoverToProduct(d, products, mediaAssets, bundlePatch) : d,
    );
  };

  const coverSummary = bundleCoverSummary(
    draft.bundleData ?? { includedProductIds: [] },
  );

  return (
    <div className="pb-16">
      <nav className="mb-3 flex items-center gap-1 text-xs text-[var(--admin-muted)]">
        <Link
          href="/admin/bundles"
          onClick={(e) => {
            if (!confirmLeave()) e.preventDefault();
          }}
          className="hover:text-[var(--admin-text)]"
        >
          Bundles
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-[var(--admin-text)]">
          {draft.name || "New Bundle"}
        </span>
      </nav>

      <AdminPageHeader
        title={isNew || !existing ? "New Bundle" : "Edit Bundle"}
        description="Package products into a commercial offer with combined pricing, savings, and storefront visibility."
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
            <AdminButton variant="secondary" onClick={() => save("draft")}>
              Save Draft
            </AdminButton>
            <AdminButton variant="primary" onClick={() => save("active")}>
              Save Changes
            </AdminButton>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Bundle Details
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Name, slug, descriptions, and how this bundle is labeled in the
              store.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField
                label="Name"
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
                  placeholder="Creator Starter Bundle"
                />
              </AdminField>
              <AdminField label="Slug" hint="URL-safe identifier.">
                <AdminInput
                  value={draft.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    patch({ slug: e.target.value });
                  }}
                  placeholder="creator-starter-bundle"
                />
              </AdminField>
              <AdminField label="Product type">
                <AdminInput
                  value={getProductTypeConfig("BUNDLE").label}
                  disabled
                  readOnly
                />
              </AdminField>
              <AdminField label="Category">
                <AdminInput
                  value={draft.category}
                  onChange={(e) => patch({ category: e.target.value })}
                  placeholder="Bundles"
                />
              </AdminField>
              <AdminField label="Status">
                <AdminSelect
                  value={draft.status}
                  onChange={(e) =>
                    patch({
                      status: e.target.value as AdminProduct["status"],
                    })
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Access">
                <AdminInput
                  value={draft.access}
                  onChange={(e) => patch({ access: e.target.value })}
                  placeholder="Instant unlock"
                />
              </AdminField>
              <AdminField label="Short description" className="md:col-span-2">
                <AdminInput
                  value={draft.shortDescription}
                  onChange={(e) =>
                    patch({ shortDescription: e.target.value })
                  }
                  placeholder="One-line summary for cards and PDP hero."
                />
              </AdminField>
              <AdminField
                label="Description"
                className="md:col-span-2"
                hint="Longer copy for the bundle product page."
              >
                <AdminTextarea
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Everything included in this bundle and why it saves creators time."
                />
              </AdminField>
              <AdminField
                label="Tags"
                className="md:col-span-2"
                hint="Comma-separated tags."
              >
                <AdminInput
                  value={draft.tags.join(", ")}
                  onChange={(e) =>
                    patch({
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="bundle, viral, starter"
                />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Bundle Cover
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Choose how this bundle appears in cards, lists, and the live
              preview. Cover settings are stored separately from collection
              covers.
            </p>
            <BundleCoverBuilder
              draft={draft}
              includedProductIds={includedIds}
              products={products}
              onChange={handleCoverChange}
            />
          </AdminCard>

          <AdminCard>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-base font-semibold">
                  Bundle Contents
                </h2>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                  {includedIds.length} product
                  {includedIds.length === 1 ? "" : "s"} included
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  variant="primary"
                  size="sm"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add products
                </AdminButton>
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setIncluded([])}
                  disabled={!includedIds.length}
                >
                  Clear all
                </AdminButton>
              </div>
            </div>
            <BundleContentGrid
              productIds={includedIds}
              products={products}
              onReorder={setIncluded}
              onRemove={(id) =>
                setIncluded(includedIds.filter((x) => x !== id))
              }
              onAddProducts={() => setAddOpen(true)}
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Content Order
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Drag items to control the order they appear in this bundle on the
              storefront.
            </p>
            <BundleOrderList
              productIds={includedIds}
              products={products}
              onReorder={setIncluded}
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Pricing &amp; Offer
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Set bundle pricing for India and global markets. Savings are
              calculated against included product totals.
            </p>
            {totals && includedProducts.length > 0 ? (
              <div className="mb-4 rounded-xl bg-[var(--admin-surface-2)] px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <p>
                    Individual total:{" "}
                    <span className="font-medium">
                      {formatInr(totals.inr)}
                    </span>
                    <span className="text-[var(--admin-muted)]">
                      {" "}
                      / {formatUsd(totals.usd)}
                    </span>
                  </p>
                  <p className="text-[var(--admin-accent)]">
                    Savings: {formatInr(totals.saveInr)} /{" "}
                    {formatUsd(totals.saveUsd)}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="mb-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--admin-border)] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  India · INR
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="Regular">
                    <AdminInput
                      type="number"
                      value={draft.pricing.INR.regularPrice}
                      onChange={(e) =>
                        patch({
                          pricing: {
                            ...draft.pricing,
                            INR: {
                              ...draft.pricing.INR,
                              regularPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Current">
                    <AdminInput
                      type="number"
                      value={draft.pricing.INR.currentPrice}
                      onChange={(e) =>
                        patch({
                          pricing: {
                            ...draft.pricing,
                            INR: {
                              ...draft.pricing.INR,
                              currentPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </AdminField>
                </div>
                {inrPct > 0 ? (
                  <p className="mt-2 text-xs text-[var(--admin-accent)]">
                    {inrPct}% off
                  </p>
                ) : null}
              </div>
              <div className="rounded-xl border border-[var(--admin-border)] p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Global · USD
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="Regular">
                    <AdminInput
                      type="number"
                      step="0.01"
                      value={draft.pricing.USD.regularPrice}
                      onChange={(e) =>
                        patch({
                          pricing: {
                            ...draft.pricing,
                            USD: {
                              ...draft.pricing.USD,
                              regularPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Current">
                    <AdminInput
                      type="number"
                      step="0.01"
                      value={draft.pricing.USD.currentPrice}
                      onChange={(e) =>
                        patch({
                          pricing: {
                            ...draft.pricing,
                            USD: {
                              ...draft.pricing.USD,
                              currentPrice: Number(e.target.value),
                            },
                          },
                        })
                      }
                    />
                  </AdminField>
                </div>
                {usdPct > 0 ? (
                  <p className="mt-2 text-xs text-[var(--admin-accent)]">
                    {usdPct}% off
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-3 rounded-xl border border-[var(--admin-border)] p-4">
              <AdminToggle
                checked={draft.offer.enabled}
                onChange={(enabled) =>
                  patch({ offer: { ...draft.offer, enabled } })
                }
                label="Enable offer countdown"
              />
              {draft.offer.enabled ? (
                <div className="grid gap-3 md:grid-cols-3">
                  <AdminField label="Label">
                    <AdminInput
                      value={draft.offer.label}
                      onChange={(e) =>
                        patch({
                          offer: { ...draft.offer, label: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Start">
                    <AdminInput
                      type="datetime-local"
                      value={(draft.offer.startDate ?? "").slice(0, 16)}
                      onChange={(e) =>
                        patch({
                          offer: {
                            ...draft.offer,
                            startDate: new Date(e.target.value).toISOString(),
                          },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="End">
                    <AdminInput
                      type="datetime-local"
                      value={(draft.offer.endDate ?? "").slice(0, 16)}
                      onChange={(e) =>
                        patch({
                          offer: {
                            ...draft.offer,
                            endDate: new Date(e.target.value).toISOString(),
                          },
                        })
                      }
                    />
                  </AdminField>
                  <p className="text-sm text-[var(--admin-accent)] md:col-span-3">
                    Preview:{" "}
                    {offerCountdown(draft.offer.endDate) ?? "Set an end date"}
                  </p>
                </div>
              ) : null}
            </div>
          </AdminCard>

          <ProductRelationshipsPanel
            draft={draft}
            allProducts={products}
            onChange={(relationships) => patch({ relationships })}
          />

          <AdminCard>
            <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
              Publishing
            </h2>
            <p className="mb-4 text-xs text-[var(--admin-muted)]">
              Control storefront visibility and merchandising flags.
            </p>
            <div className="flex flex-wrap gap-8">
              <AdminToggle
                checked={draft.isTrending}
                onChange={(isTrending) => patch({ isTrending })}
                label="Trending"
              />
              <AdminToggle
                checked={draft.isFeatured}
                onChange={(isFeatured) => patch({ isFeatured })}
                label="Featured"
              />
            </div>
          </AdminCard>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <AdminCard>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Bundle Status
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
                <dd>{draft.isFeatured ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Trending</dt>
                <dd>{draft.isTrending ? "Yes" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Products</dt>
                <dd>{includedIds.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[var(--admin-muted)]">Cover</dt>
                <dd className="text-right text-xs">{coverSummary}</dd>
              </div>
              {totals && includedProducts.length > 0 ? (
                <>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--admin-muted)]">Individual</dt>
                    <dd className="text-right text-xs">
                      {formatInr(totals.inr)}
                      <br />
                      {formatUsd(totals.usd)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-[var(--admin-muted)]">Savings</dt>
                    <dd className="text-right text-xs text-[var(--admin-accent)]">
                      {formatInr(totals.saveInr)}
                      <br />
                      {formatUsd(totals.saveUsd)}
                    </dd>
                  </div>
                </>
              ) : null}
              {typeMix.length > 0 ? (
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--admin-muted)]">Mix</dt>
                  <dd className="text-right text-xs">
                    {typeMix.map(([label, count]) => (
                      <span key={label} className="block">
                        {count}× {label}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </AdminCard>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Live Preview
            </h3>
            <BundleLivePreview
              draft={draft}
              includedProducts={includedProducts}
              allProducts={products}
            />
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

      <BundleAddProductsModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        bundleId={draft.id}
        includedIds={includedIds}
        products={products}
        onAddProducts={addProducts}
      />
    </div>
  );
}
