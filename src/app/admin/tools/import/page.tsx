"use client";

import { ToolEditor } from "@/admin/components/tools/ToolEditor";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
} from "@/admin/components/ui/AdminField";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { slugify } from "@/admin/lib/format";
import type { AiTool } from "@/catalog/tools/types";
import { Link2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type ImportOk = {
  ok: true;
  url: string;
  extracted: {
    name: string;
    shortDescription: string;
    fullDescription: string;
    logoUrl: string;
    coverImageUrl: string;
    officialUrl: string;
  };
  warnings: string[];
};

type ImportFail = {
  ok: false;
  url?: string;
  message: string;
};

export default function ImportToolPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [draft, setDraft] = useState<Partial<AiTool> | null>(null);

  const runImport = async () => {
    setLoading(true);
    setError(null);
    setWarnings([]);
    setDraft(null);
    try {
      const res = await fetch("/api/tools/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as ImportOk | ImportFail;
      if (!data.ok) {
        setError(data.message || "Import failed.");
        return;
      }
      const { extracted } = data;
      setWarnings(data.warnings ?? []);
      setDraft({
        name: extracted.name,
        slug: slugify(extracted.name),
        shortDescription: extracted.shortDescription,
        fullDescription: extracted.fullDescription,
        logoUrl: extracted.logoUrl || undefined,
        coverImageUrl: extracted.coverImageUrl || undefined,
        officialUrl: extracted.officialUrl || data.url,
        monitoring: {
          enabled: false,
          sourceUrl: extracted.officialUrl || data.url,
          frequency: "daily",
          automationMode: "MANUAL_REVIEW",
          status: "not_monitored",
          liveMonitoringAvailable: false,
        },
        dataOrigin: "imported",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  if (draft) {
    return (
      <div>
        {warnings.length ? (
          <div className="mb-4 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-muted)]">
              Import notes
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--admin-muted)]">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <AdminButton
              className="mt-3"
              variant="ghost"
              size="sm"
              onClick={() => setDraft(null)}
            >
              Import a different URL
            </AdminButton>
          </div>
        ) : null}
        <ToolEditor initialDraft={draft} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Import from URL"
        description="Fetch Open Graph metadata to prefill a tool draft. Prices are never invented."
        actions={
          <Link href="/admin/tools">
            <AdminButton variant="secondary">Back to tools</AdminButton>
          </Link>
        }
      />

      <AdminCard className="max-w-xl space-y-4">
        <AdminField label="Tool URL">
          <AdminInput
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/product"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runImport();
              }
            }}
          />
        </AdminField>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            variant="primary"
            disabled={!url.trim() || loading}
            onClick={() => void runImport()}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {loading ? "Fetching…" : "Fetch metadata"}
          </AdminButton>
          <AdminBadge tone="neutral">http / https only</AdminBadge>
        </div>
        {error ? (
          <p className="text-sm text-[var(--admin-danger)]">{error}</p>
        ) : null}
        <p className="text-xs text-[var(--admin-muted)]">
          Extracts title, description, images, and favicon when available. Sale
          and pricing fields stay empty for manual entry.
        </p>
      </AdminCard>
    </div>
  );
}
