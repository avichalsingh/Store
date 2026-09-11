"use client";

import { useAdmin } from "@/admin/store/AdminProvider";
import { formatInr, formatUsd } from "@/admin/lib/format";
import {
  Clapperboard,
  Film,
  Megaphone,
  Package,
  ShoppingBag,
  Users,
  UsersRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Result = {
  id: string;
  label: string;
  meta: string;
  href: string;
  icon: typeof Clapperboard;
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { products, characters, collections, orders, customers, campaigns, mediaAssets } =
    useAdmin();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all: Result[] = [
      {
        id: "nav-media",
        label: "Media Library",
        meta: "Navigate",
        href: "/admin/media",
        icon: Film,
      },
      ...products.map((p) => ({
        id: `p-${p.id}`,
        label: p.name,
        meta: `Product · ${p.characterName}`,
        href: `/admin/products/${p.id}/edit`,
        icon: Clapperboard,
      })),
      ...mediaAssets.map((a) => ({
        id: `m-${a.id}`,
        label: a.name,
        meta: `Media · ${a.processingStatus}`,
        href: `/admin/media/${a.id}`,
        icon: Film,
      })),
      ...characters.map((c) => ({
        id: `c-${c.id}`,
        label: c.name,
        meta: "Character",
        href: `/admin/characters/${c.id}`,
        icon: Users,
      })),
      ...collections.map((c) => ({
        id: `col-${c.id}`,
        label: c.name,
        meta: "Collection",
        href: `/admin/collections/${c.id}`,
        icon: Package,
      })),
      ...orders.map((o) => ({
        id: `o-${o.id}`,
        label: o.id,
        meta: `Order · ${o.customerName} · ${o.currency === "INR" ? formatInr(o.amount) : formatUsd(o.amount)}`,
        href: "/admin/orders",
        icon: ShoppingBag,
      })),
      ...customers.map((c) => ({
        id: `cu-${c.id}`,
        label: c.name,
        meta: `Customer · ${c.email}`,
        href: "/admin/customers",
        icon: UsersRound,
      })),
      ...campaigns.map((c) => ({
        id: `ca-${c.id}`,
        label: c.name,
        meta: `Campaign · ${c.status}`,
        href: "/admin/campaigns",
        icon: Megaphone,
      })),
    ];
    if (!q) return all.slice(0, 8);
    return all.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.meta.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [query, products, characters, collections, orders, customers, campaigns, mediaAssets]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        aria-label="Close command palette"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-lg)]">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products, characters, orders…"
          className="w-full border-b border-[var(--admin-border)] bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-[var(--admin-muted)]"
        />
        <ul className="max-h-80 overflow-y-auto p-2">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-[var(--admin-muted)]">
              No matches
            </li>
          ) : (
            results.map((r) => {
              const Icon = r.icon;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--admin-surface-2)]"
                    onClick={() => {
                      onClose();
                      router.push(r.href);
                    }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-surface-2)] text-[var(--admin-muted)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--admin-text)]">
                        {r.label}
                      </span>
                      <span className="block truncate text-xs text-[var(--admin-muted)]">
                        {r.meta}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
