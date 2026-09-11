"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminSelect } from "@/admin/components/ui/AdminField";
import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProductStatus } from "@/admin/types";
import {
  PRODUCT_TYPES,
  getProductTypeConfig,
  type ProductType,
} from "@/catalog/productTypes";
import { Archive, Clapperboard, Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export default function ProductsPage() {
  const {
    products,
    mediaAssets,
    duplicateProduct,
    archiveProduct,
    deleteProduct,
    hydrated,
  } = useAdmin();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | AdminProductStatus>("all");
  const [productType, setProductType] = useState<"all" | ProductType>("all");
  const [sort, setSort] = useState<"updated" | "sales" | "name">("updated");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => {
    let list = [...products];
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (productType !== "all") {
      list = list.filter((p) => p.productType === productType);
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
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "sales") return b.sales - a.sales;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [products, q, status, sort, productType]);

  if (!hydrated) return null;

  const rowSubtitle = (p: (typeof products)[number]) => {
    const typeLabel = getProductTypeConfig(p.productType).label;
    const parts = [typeLabel, p.category];
    if (p.productType === "VIDEO" && p.characterName) {
      parts.push(p.characterName);
    }
    return parts.filter(Boolean).join(" · ");
  };

  return (
    <div>
      <AdminPageHeader
        title="Products"
        description="Formats, pricing, and performance for the storefront catalog."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {productType === "AI_IMAGE" ? (
              <Link href="/admin/products/image-collections">
                <AdminButton variant="secondary">Image collections</AdminButton>
              </Link>
            ) : null}
            <Link href="/admin/products/new">
              <AdminButton variant="primary">Create product</AdminButton>
            </Link>
          </div>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <AdminSearchInput
          className="sm:max-w-xs"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <AdminSelect
          className="sm:w-44"
          value={productType}
          onChange={(e) =>
            setProductType(e.target.value as typeof productType)
          }
        >
          <option value="all">All types</option>
          {PRODUCT_TYPES.map((t) => (
            <option key={t} value={t}>
              {getProductTypeConfig(t).label}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          className="sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </AdminSelect>
        <AdminSelect
          className="sm:w-40"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="updated">Recently updated</option>
          <option value="sales">Best selling</option>
          <option value="name">Name</option>
        </AdminSelect>
      </div>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={Clapperboard}
          title="No products found"
          description="Try a different filter or create a new format."
          action={
            <Link href="/admin/products/new">
              <AdminButton variant="primary">Create product</AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <ul>
            {rows.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3 last:border-0"
              >
                <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
                  <AdminThumb
                    src={resolveProductThumbnail(p, mediaAssets)}
                    alt=""
                    sizes="44px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/products/${p.id}/edit`}
                      className="truncate text-sm font-medium hover:text-[var(--admin-accent)]"
                    >
                      {p.name}
                    </Link>
                    <AdminBadge tone="neutral">
                      {getProductTypeConfig(p.productType).label}
                    </AdminBadge>
                    <StatusBadge status={p.status} />
                    {p.isTrending ? (
                      <span className="text-[11px] text-[var(--admin-accent)]">
                        Trending
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                    {rowSubtitle(p)}
                  </p>
                </div>
                <div className="hidden text-right text-sm sm:block">
                  <p>{formatInr(p.pricing.INR.currentPrice)}</p>
                  <p className="text-xs text-[var(--admin-muted)]">
                    {formatUsd(p.pricing.USD.currentPrice)}
                  </p>
                </div>
                <div className="relative">
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </AdminButton>
                  {menuId === p.id ? (
                    <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-md)]">
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-surface-2)]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-surface-2)]"
                        onClick={() => {
                          duplicateProduct(p.id);
                          setMenuId(null);
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" /> Duplicate
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-surface-2)]"
                        onClick={() => {
                          archiveProduct(p.id);
                          setMenuId(null);
                        }}
                      >
                        <Archive className="h-3.5 w-3.5" /> Archive
                      </button>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)]"
                        onClick={() => {
                          setDeleteId(p.id);
                          setMenuId(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdminConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteProduct(deleteId);
        }}
        title="Delete product?"
        description="This removes the product from the admin mock store. This action cannot be undone."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
