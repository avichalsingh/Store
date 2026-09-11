"use client";

import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { resolveMediaThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { MediaAsset, MediaAssetType } from "@/admin/types";
import { cn } from "@/lib/utils";
import { Check, ImageIcon, Play } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function statusTone(status: MediaAsset["processingStatus"]) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing" || status === "uploading" || status === "uploaded")
    return "info" as const;
  return "neutral" as const;
}

export function MediaLibraryPickerModal({
  open,
  onClose,
  onSelect,
  onSelectMany,
  readyOnly = true,
  assetType,
  multi = false,
  excludeIds = [],
  title = "Choose from Media Library",
}: {
  open: boolean;
  onClose: () => void;
  /** Single-select callback (default). */
  onSelect?: (assetId: string) => void;
  /** Multi-select confirm callback. */
  onSelectMany?: (assetIds: string[]) => void;
  readyOnly?: boolean;
  /** Limit to videos, images, or all. */
  assetType?: MediaAssetType | "all";
  multi?: boolean;
  excludeIds?: string[];
  title?: string;
}) {
  const { mediaAssets } = useAdmin();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedMany, setSelectedMany] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setSelected(null);
      setSelectedMany([]);
    }
  }, [open]);

  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const rows = useMemo(() => {
    let list = [...mediaAssets];
    if (assetType && assetType !== "all") {
      list = list.filter((a) => a.type === assetType);
    }
    if (readyOnly) list = list.filter((a) => a.processingStatus === "ready");
    if (exclude.size) list = list.filter((a) => !exclude.has(a.id));
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          a.originalFileName.toLowerCase().includes(s),
      );
    }
    return list;
  }, [mediaAssets, q, readyOnly, assetType, exclude]);

  const toggleMany = (id: string) => {
    setSelectedMany((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const canConfirm = multi ? selectedMany.length > 0 : Boolean(selected);

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title={title}
      wide
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose}>
            Cancel
          </AdminButton>
          <AdminButton
            variant="primary"
            disabled={!canConfirm}
            onClick={() => {
              if (multi) {
                onSelectMany?.(selectedMany);
              } else if (selected) {
                onSelect?.(selected);
              }
              onClose();
            }}
          >
            {multi
              ? `Add ${selectedMany.length || ""} selected`.trim()
              : "Use selected"}
          </AdminButton>
        </>
      }
    >
      <AdminSearchInput
        className="mb-4"
        placeholder="Search media…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
        {rows.map((asset) => {
          const isImage = asset.type === "image";
          const isSelected = multi
            ? selectedMany.includes(asset.id)
            : selected === asset.id;
          const thumb = resolveMediaThumbnail(asset);
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() =>
                multi ? toggleMany(asset.id) : setSelected(asset.id)
              }
              className={cn(
                "group relative overflow-hidden rounded-xl border text-left transition",
                isSelected
                  ? "border-[var(--admin-accent)] ring-2 ring-[var(--admin-accent-soft)]"
                  : "border-[var(--admin-border)] hover:border-[var(--admin-accent)]",
              )}
            >
              <div
                className={cn(
                  "relative bg-[var(--admin-surface-2)]",
                  isImage ? "aspect-square" : "aspect-[9/16]",
                )}
              >
                <AdminThumb
                  src={thumb}
                  alt=""
                  sizes="160px"
                  rounded="rounded-none"
                />
                {!isImage ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                    <Play className="h-6 w-6 text-white" fill="white" />
                  </span>
                ) : (
                  <span className="absolute left-2 top-2 rounded-full bg-black/50 p-1 text-white">
                    <ImageIcon className="h-3 w-3" />
                  </span>
                )}
                {isSelected ? (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--admin-accent)] text-white">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </div>
              <div className="space-y-1 p-2.5">
                <p className="truncate text-xs font-medium text-[var(--admin-text)]">
                  {asset.name}
                </p>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] text-[var(--admin-muted)]">
                    {isImage
                      ? asset.master.resolution || asset.master.sizeLabel || "Image"
                      : asset.master.duration}
                  </span>
                  <AdminBadge tone={statusTone(asset.processingStatus)}>
                    {asset.processingStatus}
                  </AdminBadge>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {!rows.length ? (
        <p className="py-8 text-center text-sm text-[var(--admin-muted)]">
          No ready media assets found.
        </p>
      ) : null}
    </AdminModal>
  );
}
