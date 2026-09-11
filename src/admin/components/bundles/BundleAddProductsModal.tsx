"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminSelect } from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct } from "@/admin/types";
import {
  PRODUCT_TYPES,
  getProductTypeConfig,
  type ProductType,
} from "@/catalog/productTypes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";

type StatusFilter = "all" | "active" | "draft" | "archived";
type TypeFilter = "all" | ProductType;

export function BundleAddProductsModal({
  open,
  onClose,
  bundleId,
  includedIds,
  products,
  onAddProducts,
}: {
  open: boolean;
  onClose: () => void;
  bundleId: string;
  includedIds: string[];
  products: AdminProduct[];
  onAddProducts: (ids: string[]) => void;
}) {
  const { mediaAssets } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const includedSet = useMemo(() => new Set(includedIds), [includedIds]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (p.id === bundleId) return false;
      if (p.productType === "BUNDLE") return false;
      if (includedSet.has(p.id)) return false;
      return true;
    });
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (typeFilter !== "all") {
      list = list.filter((p) => (p.productType ?? "VIDEO") === typeFilter);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.characterName ?? "").toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s) ||
          getProductTypeConfig(p.productType).label.toLowerCase().includes(s),
      );
    }
    return list;
  }, [products, bundleId, includedSet, status, typeFilter, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setSelected(new Set());
    setQ("");
    onClose();
  };

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title="Add products to bundle"
      size="xl"
      footer={
        <>
          <p className="mr-auto text-sm text-[var(--admin-muted)]">
            {selected.size} selected
          </p>
          <AdminButton variant="secondary" onClick={handleClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            disabled={!selected.size}
            onClick={() => {
              onAddProducts([...selected]);
              handleClose();
            }}
          >
            Add {selected.size || ""} product{selected.size === 1 ? "" : "s"}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-4">
        <AdminSearchInput
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "draft", "archived"] as StatusFilter[]).map(
            (s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize",
                  status === s
                    ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                    : "text-[var(--admin-muted)] hover:bg-[var(--admin-surface-2)]",
                )}
              >
                {s}
              </button>
            ),
          )}
          <AdminSelect
            className="w-44 py-1.5 text-xs"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          >
            <option value="all">All product types</option>
            {PRODUCT_TYPES.filter((t) => t !== "BUNDLE").map((t) => (
              <option key={t} value={t}>
                {getProductTypeConfig(t).label}
              </option>
            ))}
          </AdminSelect>
        </div>
        <div className="max-h-[min(52vh,480px)] space-y-1 overflow-y-auto rounded-xl border border-[var(--admin-border)]">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
              No matching products.
            </p>
          ) : (
            filtered.map((p) => {
              const on = selected.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                    on
                      ? "bg-[var(--admin-accent-soft)]"
                      : "hover:bg-[var(--admin-surface-2)]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      on
                        ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white"
                        : "border-[var(--admin-border)]",
                    )}
                  >
                    {on ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <div className="relative h-11 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--admin-surface-2)]">
                    <AdminThumb
                      src={resolveProductThumbnail(p, mediaAssets)}
                      alt=""
                      sizes="36px"
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
                </button>
              );
            })
          )}
        </div>
      </div>
    </AdminModal>
  );
}
