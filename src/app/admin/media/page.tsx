"use client";

import { MediaLibraryCardVisual } from "@/admin/components/media/MediaLibraryCardVisual";
import { MediaProductUsage } from "@/admin/components/media/MediaProductUsage";
import { UploadMediaModal } from "@/admin/components/media/UploadMediaModal";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminConfirmDialog, AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { resolveProductThumbnail } from "@/admin/lib/resolveThumbnails";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminProduct, MediaAsset, MediaProcessingStatus } from "@/admin/types";
import { cn } from "@/lib/utils";
import {
  Eye,
  LayoutGrid,
  List,
  MoreHorizontal,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Asset kind filter — never Master/Preview (those are file versions). */
type AssetTypeFilter = "all" | "video" | "image";

type StatusFilter =
  | "all"
  | "processing"
  | "ready"
  | "failed"
  | "unused";

function statusTone(status: MediaProcessingStatus) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "danger" as const;
  if (status === "processing" || status === "uploading" || status === "uploaded")
    return "info" as const;
  return "neutral" as const;
}

function ProductOptionRow({
  product,
  mediaAssets,
  checked,
  onToggle,
}: {
  product: AdminProduct;
  mediaAssets: MediaAsset[];
  checked: boolean;
  onToggle: () => void;
}) {
  const thumb = resolveProductThumbnail(product, mediaAssets);
  const price =
    typeof product.pricing?.INR?.currentPrice === "number"
      ? `₹${product.pricing.INR.currentPrice}`
      : "";

  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--admin-border)] px-3 py-2 transition hover:bg-[var(--admin-surface-2)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 accent-[var(--admin-accent)]"
      />
      <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
        <AdminThumb src={thumb} alt="" sizes="36px" rounded="rounded-none" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-[var(--admin-text)]">
          {product.name}
        </span>
        <span className="block truncate text-[11px] text-[var(--admin-muted)]">
          {[product.characterName, product.status, price].filter(Boolean).join(" · ")}
        </span>
      </span>
    </label>
  );
}

export default function MediaLibraryPage() {
  const {
    mediaAssets,
    products,
    attachMediaToProduct,
    detachMediaFromProduct,
    deleteMediaAsset,
    regenerateMediaPreview,
    hydrated,
  } = useAdmin();
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [assetType, setAssetType] = useState<AssetTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"video" | "image">("video");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [attachAssetId, setAttachAssetId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [attachSearch, setAttachSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const openAttach = (assetId: string) => {
    const asset = mediaAssets.find((a) => a.id === assetId);
    setAttachAssetId(assetId);
    setAttachSearch("");
    setSelectedProductIds(asset?.usedByProductIds ?? []);
  };

  useEffect(() => {
    const attach = searchParams.get("attach");
    if (attach && mediaAssets.some((a) => a.id === attach)) {
      openAttach(attach);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, mediaAssets]);

  const rows = useMemo(() => {
    let list = [...mediaAssets];

    if (assetType === "video") {
      list = list.filter((a) => a.type === "video");
    } else if (assetType === "image") {
      list = list.filter((a) => a.type === "image");
    }

    if (statusFilter === "processing") {
      list = list.filter((a) =>
        ["queued", "uploading", "uploaded", "processing"].includes(
          a.processingStatus,
        ),
      );
    } else if (statusFilter === "ready") {
      list = list.filter((a) => a.processingStatus === "ready");
    } else if (statusFilter === "failed") {
      list = list.filter((a) => a.processingStatus === "failed");
    } else if (statusFilter === "unused") {
      list = list.filter((a) => a.usedByProductIds.length === 0);
    }

    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(s) ||
          a.originalFileName.toLowerCase().includes(s),
      );
    }
    list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [mediaAssets, assetType, statusFilter, q]);

  const attachAsset = attachAssetId
    ? mediaAssets.find((a) => a.id === attachAssetId)
    : undefined;

  const attachCandidates = useMemo(() => {
    let list = [...products];
    if (attachAsset?.type === "image") {
      list = list.filter((p) => p.productType === "AI_IMAGE");
    } else if (attachAsset?.type === "video") {
      list = list.filter((p) => (p.productType ?? "VIDEO") === "VIDEO");
    }
    if (attachSearch.trim()) {
      const s = attachSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.characterName ?? "").toLowerCase().includes(s) ||
          p.status.toLowerCase().includes(s),
      );
    }
    return list;
  }, [products, attachSearch, attachAsset?.type]);

  const applyAttachments = () => {
    if (!attachAssetId || !attachAsset) return;
    const prev = new Set(attachAsset.usedByProductIds);
    const next = new Set(selectedProductIds);

    for (const pid of prev) {
      if (next.has(pid)) continue;
      detachMediaFromProduct(pid);
    }
    for (const pid of next) {
      if (prev.has(pid)) continue;
      attachMediaToProduct(pid, attachAssetId);
    }
    setAttachAssetId(null);
  };

  if (!hydrated) return null;

  const assetTypeFilters: Array<{ id: AssetTypeFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "video", label: "Videos" },
    { id: "image", label: "Images" },
  ];

  const statusFilters: Array<{ id: StatusFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "processing", label: "Processing" },
    { id: "ready", label: "Ready" },
    { id: "failed", label: "Failed" },
    { id: "unused", label: "Unused" },
  ];

  const renderMeta = (asset: MediaAsset) => (
    <p className="text-[11px] text-[var(--admin-muted)]">
      {asset.type === "image"
        ? ["IMAGE", asset.master.resolution, asset.master.sizeLabel]
            .filter(Boolean)
            .join(" · ")
        : [
            "VIDEO",
            asset.master.duration,
            asset.master.resolution,
            asset.master.sizeLabel,
          ]
            .filter(Boolean)
            .join(" · ")}
    </p>
  );

  const linkedProducts = (asset: MediaAsset) =>
    products.filter((p) => asset.usedByProductIds.includes(p.id));

  return (
    <div>
      <AdminPageHeader
        title="Media Library"
        description="One upload = one asset. Preview is generated automatically from the Master."
        actions={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => {
                setUploadMode("image");
                setUploadOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </AdminButton>
            <AdminButton
              variant="primary"
              onClick={() => {
                setUploadMode("video");
                setUploadOpen(true);
              }}
            >
              <Upload className="h-4 w-4" />
              Upload Videos
            </AdminButton>
          </>
        }
      />

      <div className="mb-5 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <AdminSearchInput
            className="w-full sm:max-w-sm"
            placeholder="Search media…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex shrink-0 items-center gap-1 self-end rounded-xl border border-[var(--admin-border)] p-1 sm:self-auto">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={cn(
                "rounded-lg p-1.5",
                view === "grid"
                  ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                  : "text-[var(--admin-muted)]",
              )}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "rounded-lg p-1.5",
                view === "list"
                  ? "bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                  : "text-[var(--admin-muted)]",
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2.5 sm:px-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
              Type
            </span>
            <div className="flex flex-wrap gap-1.5">
              {assetTypeFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAssetType(f.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    assetType === f.id
                      ? "bg-[var(--admin-accent)] text-white"
                      : "bg-[var(--admin-surface-2)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-[var(--admin-border)]" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--admin-muted)]">
              Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {statusFilters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition",
                    statusFilter === f.id
                      ? "bg-[var(--admin-accent)] text-white"
                      : "bg-[var(--admin-surface-2)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!rows.length ? (
        <AdminEmptyState
          title="No media assets"
          description="Upload a video or image. Each upload creates one asset with Master + Preview."
          action={
            <AdminButton
              variant="primary"
              onClick={() => {
                setUploadMode("video");
                setUploadOpen(true);
              }}
            >
              Upload Videos
            </AdminButton>
          }
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((asset) => (
            <div
              key={asset.id}
              className="group relative overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-sm)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--admin-shadow-md)]"
            >
              <div className="relative aspect-[9/14] bg-[var(--admin-surface-2)]">
                <MediaLibraryCardVisual
                  asset={asset}
                  onRetryPreview={() => regenerateMediaPreview(asset.id)}
                />
                <div className="pointer-events-none absolute left-2 top-2 z-10">
                  <AdminBadge tone={statusTone(asset.processingStatus)}>
                    {asset.processingStatus.toUpperCase()}
                  </AdminBadge>
                </div>
              </div>
              <div className="space-y-2 p-3">
                <Link
                  href={`/admin/media/${asset.id}`}
                  className="block truncate text-sm font-semibold text-[var(--admin-text)] hover:text-[var(--admin-accent)]"
                >
                  {asset.name}
                </Link>
                {renderMeta(asset)}
                <MediaProductUsage
                  products={linkedProducts(asset)}
                  mediaAssets={mediaAssets}
                  onAttach={() => openAttach(asset.id)}
                  onChange={() => openAttach(asset.id)}
                  onManage={() => openAttach(asset.id)}
                  onDetach={(productId) => detachMediaFromProduct(productId)}
                />
                <div className="flex items-center justify-between pt-1">
                  <Link href={`/admin/media/${asset.id}`}>
                    <AdminButton variant="ghost" size="sm">
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </AdminButton>
                  </Link>
                  <div className="relative">
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setMenuId(menuId === asset.id ? null : asset.id)
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </AdminButton>
                    {menuId === asset.id ? (
                      <div className="absolute bottom-8 right-0 z-10 min-w-[140px] rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 shadow-[var(--admin-shadow-lg)]">
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-[var(--admin-danger)] hover:bg-[var(--admin-danger-soft)]"
                          onClick={() => {
                            setMenuId(null);
                            setDeleteId(asset.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-2)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Media</th>
                <th className="hidden px-4 py-3 font-medium md:table-cell">
                  Meta
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">
                  Usage
                </th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((asset) => (
                <tr
                  key={asset.id}
                  className="border-b border-[var(--admin-border)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--admin-surface-2)]">
                        <MediaLibraryCardVisual
                          asset={asset}
                          onRetryPreview={() =>
                            regenerateMediaPreview(asset.id)
                          }
                        />
                      </span>
                      <Link
                        href={`/admin/media/${asset.id}`}
                        className="min-w-0 hover:text-[var(--admin-accent)]"
                      >
                        <span className="block truncate font-medium">
                          {asset.name}
                        </span>
                        <span className="block truncate text-[11px] text-[var(--admin-muted)]">
                          {asset.originalFileName}
                        </span>
                      </Link>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    {renderMeta(asset)}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={statusTone(asset.processingStatus)}>
                      {asset.processingStatus}
                    </AdminBadge>
                  </td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <div className="max-w-xs">
                      <MediaProductUsage
                        products={linkedProducts(asset)}
                        mediaAssets={mediaAssets}
                        onAttach={() => openAttach(asset.id)}
                        onChange={() => openAttach(asset.id)}
                        onManage={() => openAttach(asset.id)}
                        onDetach={(productId) => detachMediaFromProduct(productId)}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminButton
                      variant="ghost"
                      size="sm"
                      onClick={() => openAttach(asset.id)}
                    >
                      Attach
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadMediaModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        mode={uploadMode}
      />

      <AdminModal
        open={!!attachAssetId}
        onClose={() => setAttachAssetId(null)}
        title="Attach to products"
        footer={
          <>
            <AdminButton
              variant="secondary"
              onClick={() => setAttachAssetId(null)}
            >
              Cancel
            </AdminButton>
            <AdminButton variant="primary" onClick={applyAttachments}>
              Save attachments
            </AdminButton>
          </>
        }
      >
        <p className="mb-3 text-sm text-[var(--admin-muted)]">
          Select one or more products. Detach by clearing a checkbox. Detach
          removes the relationship only — the asset and product stay intact.
        </p>
        <AdminSearchInput
          className="mb-3"
          placeholder="Search products…"
          value={attachSearch}
          onChange={(e) => setAttachSearch(e.target.value)}
        />
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {attachCandidates.map((p) => (
            <ProductOptionRow
              key={p.id}
              product={p}
              mediaAssets={mediaAssets}
              checked={selectedProductIds.includes(p.id)}
              onToggle={() => {
                setSelectedProductIds((prev) =>
                  prev.includes(p.id)
                    ? prev.filter((id) => id !== p.id)
                    : [...prev, p.id],
                );
              }}
            />
          ))}
          {!attachCandidates.length ? (
            <p className="py-6 text-center text-sm text-[var(--admin-muted)]">
              No products match
            </p>
          ) : null}
        </div>
      </AdminModal>

      <AdminConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete media asset?"
        description="This removes the asset from the library and detaches it from products. The original file is removed from local storage."
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteId) deleteMediaAsset(deleteId);
        }}
      />
    </div>
  );
}
