"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminSelect, AdminToggle } from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminTabs } from "@/admin/components/ui/AdminTabs";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { formatInr } from "@/admin/lib/format";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  AdminCharacter,
  AdminCollection,
  AdminProduct,
  CollectionCharacterRule,
} from "@/admin/types";
import {
  PRODUCT_TYPES,
  getProductTypeConfig,
  type ProductType,
} from "@/catalog/productTypes";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type Tab = "products" | "characters";
type StatusFilter = "all" | "active" | "draft" | "archived";
type TypeFilter = "all" | ProductType;

export function AddContentModal({
  open,
  onClose,
  products,
  characters,
  collection,
  onAddProducts,
  onUpdateRules,
}: {
  open: boolean;
  onClose: () => void;
  products: AdminProduct[];
  characters: AdminCharacter[];
  collection: AdminCollection;
  onAddProducts: (ids: string[]) => void;
  onUpdateRules: (rules: CollectionCharacterRule[]) => void;
}) {
  const { mediaAssets } = useAdmin();
  const [tab, setTab] = useState<Tab>("products");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [characterFilter, setCharacterFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedChar, setExpandedChar] = useState<string | null>(null);

  const rules = collection.characterRules ?? [];

  const filtered = useMemo(() => {
    let list = [...products];
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (typeFilter !== "all") {
      list = list.filter((p) => (p.productType ?? "VIDEO") === typeFilter);
    }
    if (characterFilter !== "all") {
      list = list.filter((p) => p.characterId === characterFilter);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.characterName ?? "").toLowerCase().includes(s) ||
          p.tags.some((t) => t.toLowerCase().includes(s)) ||
          getProductTypeConfig(p.productType).label.toLowerCase().includes(s),
      );
    }
    return list;
  }, [products, status, typeFilter, characterFilter, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getRule = (characterId: string): CollectionCharacterRule =>
    rules.find((r) => r.characterId === characterId) ?? {
      characterId,
      includeExistingProducts: false,
      automaticallyIncludeFutureProducts: false,
    };

  const upsertRule = (
    characterId: string,
    patch: Partial<CollectionCharacterRule>,
  ) => {
    const current = getRule(characterId);
    const nextRule = { ...current, ...patch };
    const others = rules.filter((r) => r.characterId !== characterId);
    const keep =
      nextRule.includeExistingProducts ||
      nextRule.automaticallyIncludeFutureProducts;
    onUpdateRules(keep ? [...others, nextRule] : others);
  };

  const addCharacterProducts = (characterId: string) => {
    const ids = products
      .filter((p) => p.characterId === characterId)
      .map((p) => p.id);
    onAddProducts(ids);
    upsertRule(characterId, { includeExistingProducts: true });
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
      title="Add Content to Collection"
      size="xl"
      footer={
        tab === "products" ? (
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
              Add {selected.size || ""} Product{selected.size === 1 ? "" : "s"}
            </AdminButton>
          </>
        ) : (
          <AdminButton variant="secondary" onClick={handleClose}>
            Done
          </AdminButton>
        )
      }
    >
      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: "products" as const, label: "Products & Videos" },
            { id: "characters" as const, label: "Characters" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "products" ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <AdminSearchInput
              className="flex-1"
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
                className="w-40 py-1.5 text-xs"
                value={typeFilter}
                onChange={(e) =>
                  setTypeFilter(e.target.value as TypeFilter)
                }
              >
                <option value="all">All product types</option>
                {PRODUCT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {getProductTypeConfig(t).label}
                  </option>
                ))}
              </AdminSelect>
              <AdminSelect
                className="w-36 py-1.5 text-xs"
                value={characterFilter}
                onChange={(e) => setCharacterFilter(e.target.value)}
              >
                <option value="all">All characters</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </AdminSelect>
            </div>
          </div>

          <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => {
              const on = selected.has(p.id) || collection.productIds.includes(p.id);
              const already = collection.productIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={already}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border text-left transition",
                    on
                      ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]/40"
                      : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/40",
                    already && "opacity-60",
                  )}
                >
                  <div className="relative aspect-[3/4] bg-[var(--admin-surface-2)]">
                    <AdminThumb
                      src={resolveProductThumbnail(p, mediaAssets)}
                      alt=""
                      sizes="160px"
                      rounded="rounded-none"
                    />
                    {(selected.has(p.id) || already) && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-accent)] text-white">
                        <Check className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-[11px] text-[var(--admin-muted)]">
                      {p.characterName ?? "—"}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="text-[11px] font-medium">
                        {formatInr(p.pricing.INR.currentPrice)}
                      </span>
                      <AdminBadge
                        tone={p.status === "active" ? "success" : "neutral"}
                      >
                        {p.status}
                      </AdminBadge>
                    </div>
                    {already ? (
                      <p className="mt-1 text-[10px] text-[var(--admin-muted)]">
                        Already in collection
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-h-[55vh] space-y-3 overflow-y-auto">
          {characters.map((c) => {
            const charProducts = products.filter((p) => p.characterId === c.id);
            const rule = getRule(c.id);
            const openRow = expandedChar === c.id;
            return (
              <div
                key={c.id}
                className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]"
              >
                <div className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() =>
                      setExpandedChar(openRow ? null : c.id)
                    }
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[var(--admin-surface-2)]">
                      {c.image ? (
                        <Image
                          src={c.image}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--admin-text)]">{c.name}</p>
                      <p className="text-xs text-[var(--admin-muted)]">
                        {charProducts.length} products
                      </p>
                    </div>
                    {openRow ? (
                      <ChevronDown className="ml-auto h-4 w-4 text-[var(--admin-muted)]" />
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 text-[var(--admin-muted)]" />
                    )}
                  </button>
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    onClick={() => addCharacterProducts(c.id)}
                  >
                    Add all products
                  </AdminButton>
                </div>
                <div className="border-t border-[var(--admin-border)] px-3 py-2.5">
                  <AdminToggle
                    checked={rule.automaticallyIncludeFutureProducts}
                    onChange={(automaticallyIncludeFutureProducts) =>
                      upsertRule(c.id, { automaticallyIncludeFutureProducts })
                    }
                    label={`Automatically include future ${c.name} products`}
                  />
                  <p className="mt-1 pl-11 text-[11px] text-[var(--admin-muted)]">
                    New products assigned to {c.name} will automatically be added
                    to this collection.
                  </p>
                </div>
                {openRow ? (
                  <div className="grid grid-cols-3 gap-2 border-t border-[var(--admin-border)] p-3 sm:grid-cols-4">
                    {charProducts.map((p) => {
                      const inCol = collection.productIds.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (!inCol) onAddProducts([p.id]);
                          }}
                          className={cn(
                            "overflow-hidden rounded-lg border text-left",
                            inCol
                              ? "border-[var(--admin-accent)] opacity-70"
                              : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50",
                          )}
                        >
                          <div className="relative aspect-[3/4] bg-[var(--admin-surface-2)]">
                            <AdminThumb
                              src={resolveProductThumbnail(p, mediaAssets)}
                              alt=""
                              sizes="100px"
                              rounded="rounded-none"
                            />
                          </div>
                          <p className="truncate px-1.5 py-1 text-[10px]">{p.name}</p>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AdminModal>
  );
}
