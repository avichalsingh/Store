"use client";

import { ToolsSettingsPanel } from "@/admin/components/tools/ToolsSettingsPanel";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminEmptyState } from "@/admin/components/ui/AdminEmptyState";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminStatCard } from "@/admin/components/ui/AdminStatCard";
import { formatDateTime } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { ToolMonitorStatus } from "@/catalog/tools/types";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

function monitorTone(
  status: ToolMonitorStatus,
): "neutral" | "success" | "warning" | "danger" | "info" | "accent" {
  switch (status) {
    case "up_to_date":
      return "success";
    case "sale_detected":
    case "change_detected":
      return "warning";
    case "needs_review":
    case "check_failed":
      return "danger";
    case "demo_simulated":
      return "accent";
    case "not_monitored":
    default:
      return "neutral";
  }
}

export default function ToolsMonitoringPage() {
  const {
    aiTools,
    toolPendingChanges,
    toolPriceHistory,
    resolveToolPendingChange,
    hydrated,
  } = useAdmin();

  const monitored = useMemo(
    () => aiTools.filter((t) => t.monitoring.enabled),
    [aiTools],
  );

  const pending = useMemo(
    () => toolPendingChanges.filter((c) => c.status === "pending"),
    [toolPendingChanges],
  );

  const toolName = (id: string) =>
    aiTools.find((t) => t.id === id)?.name ?? id;

  if (!hydrated) return null;

  const needsReview = monitored.filter((t) =>
    ["needs_review", "change_detected", "sale_detected", "check_failed"].includes(
      t.monitoring.status,
    ),
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tools monitoring"
        description="Review demo price/sale detections and pending changes."
        actions={
          <Link href="/admin/tools">
            <AdminButton variant="secondary">All tools</AdminButton>
          </Link>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--admin-warning-soft)] bg-[color-mix(in_oklab,var(--admin-warning)_10%,white)] px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--admin-warning)]" />
        <p>
          Live price checks are not running in this environment. Statuses and
          pending changes below are seed/demo data for review workflows.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatCard
          label="Monitored"
          value={monitored.length}
          icon={Activity}
        />
        <AdminStatCard
          label="Pending review"
          value={pending.length}
          icon={Clock}
        />
        <AdminStatCard
          label="Needs attention"
          value={needsReview}
          icon={AlertTriangle}
        />
        <AdminStatCard
          label="History entries"
          value={toolPriceHistory.length}
          icon={CheckCircle2}
        />
      </div>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Pending changes
        </h2>
        {pending.length === 0 ? (
          <AdminEmptyState
            icon={CheckCircle2}
            title="No pending changes"
            description="When detections are queued, they appear here for approve / reject / edit."
          />
        ) : (
          <div className="space-y-3">
            {pending.map((change) => (
              <AdminCard key={change.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/tools/${change.toolId}/edit`}
                        className="text-sm font-medium hover:text-[var(--admin-accent)]"
                      >
                        {toolName(change.toolId)}
                      </Link>
                      <AdminBadge tone="warning">{change.changeKind}</AdminBadge>
                      <AdminBadge tone="neutral">
                        {change.confidence}% conf.
                      </AdminBadge>
                    </div>
                    <p className="mt-1 text-sm text-[var(--admin-muted)]">
                      {change.summary}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {formatDateTime(change.createdAt)}
                      {change.sourceUrl ? ` · ${change.sourceUrl}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <AdminButton
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        resolveToolPendingChange(change.id, "approve")
                      }
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </AdminButton>
                    <AdminButton
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        resolveToolPendingChange(change.id, "reject")
                      }
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </AdminButton>
                    <Link href={`/admin/tools/${change.toolId}/edit`}>
                      <AdminButton size="sm" variant="secondary">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </AdminButton>
                    </Link>
                  </div>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-xl bg-[var(--admin-surface-2)] p-3">
                    <p className="mb-1 font-medium text-[var(--admin-muted)]">
                      Previous
                    </p>
                    <pre className="whitespace-pre-wrap text-[var(--admin-text)]">
                      {JSON.stringify(change.previousSnapshot, null, 2)}
                    </pre>
                  </div>
                  <div className="rounded-xl bg-[var(--admin-surface-2)] p-3">
                    <p className="mb-1 font-medium text-[var(--admin-muted)]">
                      Detected
                    </p>
                    <pre className="whitespace-pre-wrap text-[var(--admin-text)]">
                      {JSON.stringify(change.detectedSnapshot, null, 2)}
                    </pre>
                  </div>
                </div>
              </AdminCard>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Monitored tools
        </h2>
        {monitored.length === 0 ? (
          <AdminEmptyState
            title="No monitored tools"
            description="Enable monitoring on a tool to track it here (demo only)."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <ul>
              {monitored.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 border-b border-[var(--admin-border)] px-4 py-3 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/tools/${t.id}/edit`}
                      className="text-sm font-medium hover:text-[var(--admin-accent)]"
                    >
                      {t.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[var(--admin-muted)]">
                      {t.monitoring.frequency} · {t.monitoring.automationMode}
                      {t.monitoring.lastCheckedAt
                        ? ` · checked ${formatDateTime(t.monitoring.lastCheckedAt)}`
                        : ""}
                    </p>
                  </div>
                  <AdminBadge tone={monitorTone(t.monitoring.status)}>
                    {t.monitoring.status}
                  </AdminBadge>
                  {t.offer.saleActive ? (
                    <AdminBadge tone="warning">Sale</AdminBadge>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Price history
        </h2>
        {toolPriceHistory.length === 0 ? (
          <AdminEmptyState
            title="No history yet"
            description="Approved or rejected changes append history entries."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
            <ul>
              {toolPriceHistory.map((h) => (
                <li
                  key={h.id}
                  className="border-b border-[var(--admin-border)] px-4 py-3 last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/tools/${h.toolId}/edit`}
                      className="text-sm font-medium hover:text-[var(--admin-accent)]"
                    >
                      {toolName(h.toolId)}
                    </Link>
                    <AdminBadge tone="neutral">{h.changeType}</AdminBadge>
                    <AdminBadge tone={h.applied ? "success" : "warning"}>
                      {h.applied ? `applied (${h.appliedBy})` : "not applied"}
                    </AdminBadge>
                    <AdminBadge tone="info">{h.origin}</AdminBadge>
                  </div>
                  <p className="mt-1 text-xs text-[var(--admin-muted)]">
                    {formatDateTime(h.detectedAt)}
                    {h.previousValue ? ` · ${h.previousValue}` : ""}
                    {h.newValue ? ` → ${h.newValue}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="max-w-xl">
        <ToolsSettingsPanel />
      </div>
    </div>
  );
}
