"use client";

import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr, formatUsd } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import { getProductTypeConfig } from "@/catalog/productTypes";
import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * Commercial Bundles admin — separate from Collections (related content).
 * Bundles are purchasable packages of included products.
 */
export default function BundlesAdminPage() {
  const { products, mediaAssets, hydrated } = useAdmin();
  const [q, setQ] = useState("");

  const bundles = useMemo(() => {
    let list = products.filter((p) => p.productType === "BUNDLE");
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.slug.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s),
      );
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [products, q]);

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Bundles"
        description="Purchasable packages for combined pricing, upsells, and cross-sells. Separate from Collections (which organize related content for discovery)."
        actions={
          <Link href="/admin/bundles/new">
            <AdminButton variant="primary">Create bundle</AdminButton>
          </Link>
        }
      />

      <AdminSearchInput
        className="mb-4 max-w-sm"
        placeholder="Search bundles…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {bundles.length === 0 ? (
        <AdminEmptyState
          title="No bundles yet"
          description="Create a Bundle product to package videos, images, captions, hashtags, or mixed types into one offer."
          action={
            <Link href="/admin/bundles/new">
              <AdminButton variant="primary">Create bundle</AdminButton>
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-[var(--admin-border)] overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          {bundles.map((b) => {
            const count =
              b.bundleData?.includedProductIds?.length ??
              (b.relationships ?? []).filter(
                (r) => r.relationshipType === "INCLUDED_IN_BUNDLE",
              ).length;
            return (
              <li
                key={b.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
                    <AdminThumb
                      src={resolveProductThumbnail(b, mediaAssets)}
                      alt=""
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{b.name}</p>
                      <StatusBadge status={b.status} />
                      <AdminBadge tone="neutral">
                        {getProductTypeConfig("BUNDLE").label}
                      </AdminBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                      {count} included · {formatInr(b.pricing.INR.currentPrice)}{" "}
                      · {formatUsd(b.pricing.USD.currentPrice)}
                    </p>
                  </div>
                </div>
                <Link href={`/admin/bundles/${b.id}`}>
                  <AdminButton size="sm" variant="secondary">
                    Edit bundle
                  </AdminButton>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
