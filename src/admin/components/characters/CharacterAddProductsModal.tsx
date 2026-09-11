"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminSelect } from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { formatInr } from "@/admin/lib/format";
import type { AdminCharacter, AdminProduct } from "@/admin/types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";

type StatusFilter = "all" | "active" | "draft" | "archived";
type CharacterFilter = "all" | "others" | "this";

export function CharacterAddProductsModal({
  open,
  onClose,
  products,
  characters,
  characterId,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  products: AdminProduct[];
  characters: AdminCharacter[];
  characterId: string;
  onAdd: (ids: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [characterFilter, setCharacterFilter] =
    useState<CharacterFilter>("others");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = [...products];
    if (status !== "all") list = list.filter((p) => p.status === status);
    if (characterFilter === "this") {
      list = list.filter((p) => p.characterId === characterId);
    } else if (characterFilter === "others") {
      list = list.filter((p) => p.characterId !== characterId);
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.characterName ?? "").toLowerCase().includes(s) ||
          p.tags.some((t) => t.toLowerCase().includes(s)),
      );
    }
    return list;
  }, [products, status, characterFilter, q, characterId]);

  const toggle = (id: string, already: boolean) => {
    if (already) return;
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

  const reassignCount = [...selected].filter((id) => {
    const p = products.find((x) => x.id === id);
    return p && p.characterId !== characterId;
  }).length;

  return (
    <AdminModal
      open={open}
      onClose={handleClose}
      title="Add Products to Character"
      size="xl"
      footer={
        <>
          <p className="mr-auto max-w-sm text-xs text-[var(--admin-muted)]">
            {reassignCount > 0
              ? "Selecting products from other characters will reassign them here."
              : `${selected.size} selected`}
          </p>
          <AdminButton variant="secondary" onClick={handleClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            disabled={!selected.size}
            onClick={() => {
              onAdd([...selected]);
              handleClose();
            }}
          >
            Add {selected.size || ""} Product{selected.size === 1 ? "" : "s"}
          </AdminButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminSearchInput
            className="flex-1"
            placeholder="Search products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {(["all", "active", "draft"] as StatusFilter[]).map((s) => (
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
            ))}
            <AdminSelect
              className="w-44 py-1.5 text-xs"
              value={characterFilter}
              onChange={(e) =>
                setCharacterFilter(e.target.value as CharacterFilter)
              }
            >
              <option value="all">All products</option>
              <option value="others">Other characters</option>
              <option value="this">This character</option>
            </AdminSelect>
          </div>
        </div>

        <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => {
            const already = p.characterId === characterId;
            const on = selected.has(p.id) || already;
            const otherChar =
              !already &&
              characters.find((c) => c.id === p.characterId)?.name;
            return (
              <button
                key={p.id}
                type="button"
                disabled={already}
                onClick={() => toggle(p.id, already)}
                className={cn(
                  "relative overflow-hidden rounded-xl border text-left transition",
                  already
                    ? "cursor-not-allowed border-[var(--admin-border)] opacity-60"
                    : on
                      ? "border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent-soft)]"
                      : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]/50",
                )}
              >
                <div className="relative aspect-[9/16] bg-[var(--admin-surface-2)]">
                  <Image
                    src={p.media.thumbnail || "/media/videos/pulse-drop.jpg"}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="160px"
                  />
                  {on ? (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-accent)] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-1 text-xs font-medium">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-1">
                    <AdminBadge tone="neutral">{p.status}</AdminBadge>
                    {already ? (
                      <AdminBadge tone="accent">Assigned</AdminBadge>
                    ) : otherChar ? (
                      <span className="text-[10px] text-[var(--admin-muted)]">
                        {otherChar}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-[var(--admin-muted)]">
                    {formatInr(p.pricing.INR.currentPrice)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {!filtered.length ? (
          <p className="py-8 text-center text-sm text-[var(--admin-muted)]">
            No products match these filters.
          </p>
        ) : null}
      </div>
    </AdminModal>
  );
}
