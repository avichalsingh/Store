"use client";

import { ToolsSettingsPanel } from "@/admin/components/tools/ToolsSettingsPanel";
import { AdminBadge, StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSearchInput } from "@/admin/components/ui/AdminSearchInput";
import { AdminSelect } from "@/admin/components/ui/AdminField";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { useAdmin } from "@/admin/store/AdminProvider";
import {
  TOOL_CATEGORIES,
  TOOL_CATEGORY_CONFIG,
  type ToolCategoryId,
  type ToolStatus,
} from "@/catalog/tools/types";
import {
  Activity,
  Link2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type BoolFilter = "all" | "yes" | "no";

export default function ToolsListPage() {
  const { aiTools, deleteAiTool, hydrated } = useAdmin();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<"all" | ToolCategoryId>("all");
  const [status, setStatus] = useState<"all" | ToolStatus>("all");
  const [featured, setFeatured] = useState<BoolFilter>("all");
  const [monitored, setMonitored] = useState<BoolFilter>("all");
  const [sale, setSale] = useState<BoolFilter>("all");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const rows = useMemo(() => {
    let list = [...aiTools];
    if (category !== "all") {
      list = list.filter(
        (t) => t.primaryCategory === category || t.categories.includes(category),
      );
    }
    if (status !== "all") list = list.filter((t) => t.status === status);
    if (featured === "yes") list = list.filter((t) => t.featured);
    if (featured === "no") list = list.filter((t) => !t.featured);
    if (monitored === "yes") list = list.filter((t) => t.monitoring.enabled);
    if (monitored === "no") list = list.filter((t) => !t.monitoring.enabled);
    if (sale === "yes") list = list.filter((t) => t.offer.saleActive);
    if (sale === "no") list = list.filter((t) => !t.offer.saleActive);
    if (q.trim()) {
      const s = q.toLowerCase();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(s) ||
          t.slug.toLowerCase().includes(s) ||
          t.shortDescription.toLowerCase().includes(s) ||
          t.tags.some((tag) => tag.toLowerCase().includes(s)),
      );
    }
    list.sort((a, b) => a.sortOrder - b.sortOrder || b.updatedAt.localeCompare(a.updatedAt));
    return list;
  }, [aiTools, q, category, status, featured, monitored, sale]);

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="AI Tools"
        description="Affiliate / demo tools catalog for the RHYTHM Tools surface."
        actions={
          <>
            <Link href="/admin/tools/monitoring">
              <AdminButton variant="secondary">
                <Activity className="h-3.5 w-3.5" />
                Monitoring
              </AdminButton>
            </Link>
            <Link href="/admin/tools/import">
              <AdminButton variant="secondary">
                <Link2 className="h-3.5 w-3.5" />
                Import from URL
              </AdminButton>
            </Link>
            <Link href="/admin/tools/new">
              <AdminButton variant="primary">
                <Plus className="h-3.5 w-3.5" />
                Create
              </AdminButton>
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <AdminSearchInput
          className="sm:max-w-xs"
          placeholder="Search tools…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <AdminSelect
          className="sm:w-44"
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as typeof category)
          }
        >
          <option value="all">All categories</option>
          {TOOL_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {TOOL_CATEGORY_CONFIG[c].label}
            </option>
          ))}
        </AdminSelect>
        <AdminSelect
          className="sm:w-36"
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="inactive">Inactive</option>
        </AdminSelect>
        <AdminSelect
          className="sm:w-36"
          value={featured}
          onChange={(e) => setFeatured(e.target.value as BoolFilter)}
        >
          <option value="all">Featured: all</option>
          <option value="yes">Featured</option>
          <option value="no">Not featured</option>
        </AdminSelect>
        <AdminSelect
          className="sm:w-40"
          value={monitored}
          onChange={(e) => setMonitored(e.target.value as BoolFilter)}
        >
          <option value="all">Monitored: all</option>
          <option value="yes">Monitored</option>
          <option value="no">Not monitored</option>
        </AdminSelect>
        <AdminSelect
          className="sm:w-36"
          value={sale}
          onChange={(e) => setSale(e.target.value as BoolFilter)}
        >
          <option value="all">Sale: all</option>
          <option value="yes">On sale</option>
          <option value="no">No sale</option>
        </AdminSelect>
        <AdminButton
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings((v) => !v)}
        >
          {showSettings ? "Hide settings" : "Tools settings"}
        </AdminButton>
      </div>

      {showSettings ? (
        <div className="mb-6 max-w-xl">
          <ToolsSettingsPanel />
        </div>
      ) : null}

      {rows.length === 0 ? (
        <AdminEmptyState
          icon={Wrench}
          title="No tools found"
          description="Try a different filter, create a tool, or import from a URL."
          action={
            <Link href="/admin/tools/new">
              <AdminButton variant="primary">Create tool</AdminButton>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
          <ul>
            {rows.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3 last:border-0"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--admin-surface-2)]">
                  <AdminThumb
                    src={t.logoUrl || t.coverImageUrl || ""}
                    alt=""
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/tools/${t.id}/edit`}
                      className="truncate text-sm font-medium hover:text-[var(--admin-accent)]"
                    >
                      {t.name}
                    </Link>
                    <AdminBadge tone="neutral">
                      {TOOL_CATEGORY_CONFIG[t.primaryCategory].label}
                    </AdminBadge>
                    <StatusBadge status={t.status} />
                    <AdminBadge tone="info">{t.dataOrigin}</AdminBadge>
                    {t.featured ? (
                      <span className="text-[11px] text-[var(--admin-accent)]">
                        Featured
                      </span>
                    ) : null}
                    {t.offer.saleActive ? (
                      <AdminBadge tone="warning">Sale</AdminBadge>
                    ) : null}
                    {t.monitoring.enabled ? (
                      <AdminBadge tone="accent">Monitored</AdminBadge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--admin-muted)]">
                    {t.shortDescription || t.officialUrl}
                  </p>
                </div>
                <div className="hidden text-right text-sm sm:block">
                  {t.pricing.currentPrice != null ? (
                    <p>
                      {t.pricing.currency} {t.pricing.currentPrice}
                      {t.pricing.billingPeriod && t.pricing.billingPeriod !== "unknown"
                        ? `/${t.pricing.billingPeriod === "one_time" ? "once" : t.pricing.billingPeriod}`
                        : ""}
                    </p>
                  ) : (
                    <p className="text-[var(--admin-muted)]">
                      {t.pricing.pricingType}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <AdminButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setMenuId(menuId === t.id ? null : t.id)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </AdminButton>
                  {menuId === t.id ? (
                    <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-[var(--admin-shadow-md)]">
                      <Link
                        href={`/admin/tools/${t.id}/edit`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--admin-surface-2)]"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Link>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--admin-danger)] hover:bg-[var(--admin-surface-2)]"
                        onClick={() => {
                          setMenuId(null);
                          setDeleteId(t.id);
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
          if (deleteId) deleteAiTool(deleteId);
        }}
        title="Delete tool?"
        description="This removes the tool and any pending monitoring changes for it."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
