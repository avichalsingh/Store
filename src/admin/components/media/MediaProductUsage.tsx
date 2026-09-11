"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import type { AdminProduct, MediaAsset } from "@/admin/types";
import { Link2, Unlink } from "lucide-react";
import Link from "next/link";

function formatPrice(p: AdminProduct) {
  const inr = p.pricing?.INR?.currentPrice;
  if (typeof inr === "number") return `₹${inr}`;
  return "";
}

type Props = {
  products: AdminProduct[];
  mediaAssets?: MediaAsset[];
  onAttach: () => void;
  onChange?: () => void;
  onDetach: (productId: string) => void;
  onManage?: () => void;
};

export function MediaProductUsage({
  products,
  mediaAssets = [],
  onAttach,
  onChange,
  onDetach,
  onManage,
}: Props) {
  const count = products.length;

  if (count === 0) {
    return (
      <div className="rounded-xl bg-[var(--admin-surface-2)] px-2.5 py-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Not used in a product
        </p>
        <div className="flex flex-wrap gap-1">
          <Link href="/admin/products/new">
            <AdminButton variant="secondary" size="sm">
              Create Product
            </AdminButton>
          </Link>
          <AdminButton variant="ghost" size="sm" onClick={onAttach}>
            Attach to Product
          </AdminButton>
        </div>
      </div>
    );
  }

  if (count === 1) {
    const p = products[0];
    const price = formatPrice(p);
    const thumb = resolveProductThumbnail(p, mediaAssets);
    return (
      <div className="rounded-xl bg-[var(--admin-surface-2)] px-2.5 py-2">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Used in product
        </p>
        <Link
          href={`/admin/products/${p.id}/edit`}
          className="mb-2 flex items-center gap-2.5 rounded-lg p-1 transition hover:bg-[var(--admin-surface)]"
        >
          <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg">
            <AdminThumb src={thumb} alt={p.name} sizes="36px" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-[var(--admin-text)]">
              {p.name}
            </span>
            <span className="block truncate text-[11px] text-[var(--admin-muted)]">
              {[p.characterName, p.status, price].filter(Boolean).join(" · ")}
            </span>
          </span>
        </Link>
        <div className="flex flex-wrap gap-1">
          <Link href={`/admin/products/${p.id}/edit`}>
            <AdminButton variant="secondary" size="sm">
              Open Product
            </AdminButton>
          </Link>
          <AdminButton variant="ghost" size="sm" onClick={onChange ?? onAttach}>
            Change
          </AdminButton>
          <AdminButton variant="ghost" size="sm" onClick={() => onDetach(p.id)}>
            <Unlink className="h-3.5 w-3.5" />
            Detach
          </AdminButton>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[var(--admin-surface-2)] px-2.5 py-2">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
        Used in {count} products
      </p>
      <ul className="mb-2 max-h-36 space-y-1.5 overflow-y-auto">
        {products.map((p) => {
          const price = formatPrice(p);
          const thumb = resolveProductThumbnail(p, mediaAssets);
          return (
            <li key={p.id}>
              <Link
                href={`/admin/products/${p.id}/edit`}
                className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-[var(--admin-surface)]"
              >
                <span className="relative h-11 w-9 shrink-0 overflow-hidden rounded-lg">
                  <AdminThumb src={thumb} alt={p.name} sizes="36px" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-[var(--admin-text)]">
                    {p.name}
                  </span>
                  <span className="block truncate text-[10px] text-[var(--admin-muted)]">
                    {[p.characterName, p.status, price].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-1">
        <AdminButton variant="secondary" size="sm" onClick={onManage ?? onAttach}>
          <Link2 className="h-3.5 w-3.5" />
          Manage Attachments
        </AdminButton>
      </div>
    </div>
  );
}
