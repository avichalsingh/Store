"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr, uid } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import type { ProductRelationship } from "@/catalog/productPayloads";
import {
  getProductTypeConfig,
  type ProductRelationshipType,
} from "@/catalog/productTypes";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

const PANEL_TYPES: ProductRelationshipType[] = [
  "ADD_ON",
  "RELATED",
  "RECOMMENDED",
];

function typeLabel(t: ProductRelationshipType): string {
  switch (t) {
    case "ADD_ON":
      return "Add-on";
    case "RELATED":
      return "Related";
    case "RECOMMENDED":
      return "Recommended";
    case "INCLUDED_IN_BUNDLE":
      return "Included in bundle";
    default:
      return t;
  }
}

export function ProductRelationshipsPanel({
  draft,
  allProducts,
  onChange,
}: {
  draft: AdminProduct;
  allProducts: AdminProduct[];
  onChange: (rels: ProductRelationship[]) => void;
}) {
  const { mediaAssets } = useAdmin();
  const [q, setQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addType, setAddType] =
    useState<ProductRelationshipType>("RELATED");

  const panelRels = useMemo(
    () =>
      (draft.relationships ?? [])
        .filter((r) => PANEL_TYPES.includes(r.relationshipType))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [draft.relationships],
  );

  const otherRels = useMemo(
    () =>
      (draft.relationships ?? []).filter(
        (r) => !PANEL_TYPES.includes(r.relationshipType),
      ),
    [draft.relationships],
  );

  const linkedIds = useMemo(
    () => new Set(panelRels.map((r) => r.relatedProductId)),
    [panelRels],
  );

  const candidates = useMemo(() => {
    const s = q.trim().toLowerCase();
    return allProducts.filter((p) => {
      if (p.id === draft.id) return false;
      if (linkedIds.has(p.id)) return false;
      if (!s) return true;
      return (
        p.name.toLowerCase().includes(s) ||
        (p.characterName ?? "").toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s) ||
        getProductTypeConfig(p.productType).label.toLowerCase().includes(s)
      );
    });
  }, [allProducts, draft.id, linkedIds, q]);

  const commitPanel = (nextPanel: ProductRelationship[]) => {
    const ordered = nextPanel.map((r, i) => ({ ...r, sortOrder: i }));
    onChange([...otherRels, ...ordered]);
  };

  const addProduct = (productId: string) => {
    commitPanel([
      ...panelRels,
      {
        id: uid("rel"),
        relatedProductId: productId,
        relationshipType: addType,
        sortOrder: panelRels.length,
      },
    ]);
    setPickerOpen(false);
    setQ("");
  };

  const updateRel = (
    id: string,
    patch: Partial<ProductRelationship>,
  ) => {
    commitPanel(
      panelRels.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  };

  const removeRel = (id: string) => {
    commitPanel(panelRels.filter((r) => r.id !== id));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= panelRels.length) return;
    const next = [...panelRels];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commitPanel(next);
  };

  return (
    <AdminCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Related products & offers
          </h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Link add-ons, related, or recommended products without duplicating
            content.
          </p>
        </div>
        <AdminButton
          size="sm"
          variant="secondary"
          onClick={() => setPickerOpen((o) => !o)}
        >
          <Plus className="h-3.5 w-3.5" /> Add product
        </AdminButton>
      </div>

      {panelRels.length === 0 ? (
        <p className="mb-4 text-sm text-[var(--admin-muted)]">
          No related products linked yet.
        </p>
      ) : (
        <div className="mb-4 space-y-2">
          {panelRels.map((rel, index) => {
            const product = allProducts.find(
              (p) => p.id === rel.relatedProductId,
            );
            return (
              <div
                key={rel.id}
                className="rounded-xl border border-[var(--admin-border)] p-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                    <AdminThumb
                      src={
                        product
                          ? resolveProductThumbnail(product, mediaAssets)
                          : undefined
                      }
                      alt=""
                      sizes="36px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {product?.name ?? "Missing product"}
                    </p>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {product
                        ? `${getProductTypeConfig(product.productType).label} · ${formatInr(product.pricing.INR.currentPrice)} · ${product.status}`
                        : rel.relatedProductId}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <AdminField label="Relationship">
                        <AdminSelect
                          value={rel.relationshipType}
                          onChange={(e) =>
                            updateRel(rel.id, {
                              relationshipType: e.target
                                .value as ProductRelationshipType,
                            })
                          }
                        >
                          {PANEL_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {typeLabel(t)}
                            </option>
                          ))}
                        </AdminSelect>
                      </AdminField>
                      <AdminField
                        label="Custom price INR"
                        hint="Optional add-on override"
                      >
                        <AdminInput
                          type="number"
                          value={rel.customPriceInr ?? ""}
                          onChange={(e) => {
                            const raw = e.target.value;
                            updateRel(rel.id, {
                              customPriceInr:
                                raw === "" ? undefined : Number(raw),
                            });
                          }}
                          placeholder="—"
                        />
                      </AdminField>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      disabled={index === panelRels.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRel(rel.id)}
                      aria-label="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AdminButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pickerOpen ? (
        <div className="rounded-xl border border-[var(--admin-border)] p-3">
          <div className="mb-3 grid gap-3 sm:grid-cols-[1fr_160px]">
            <AdminSearchInput
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <AdminSelect
              value={addType}
              onChange={(e) =>
                setAddType(e.target.value as ProductRelationshipType)
              }
            >
              {PANEL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </AdminSelect>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="px-1 py-3 text-sm text-[var(--admin-muted)]">
                No matching products.
              </p>
            ) : (
              candidates.slice(0, 40).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-[var(--admin-surface-2)]"
                >
                  <div className="relative h-10 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                    <AdminThumb
                      src={resolveProductThumbnail(p, mediaAssets)}
                      alt=""
                      sizes="32px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <AdminBadge tone="neutral">
                        {getProductTypeConfig(p.productType).label}
                      </AdminBadge>
                    </div>
                    <p className="text-xs text-[var(--admin-muted)]">
                      {formatInr(p.pricing.INR.currentPrice)} · {p.status}
                    </p>
                  </div>
                  <Plus className="h-4 w-4 shrink-0 text-[var(--admin-muted)]" />
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </AdminCard>
  );
}
