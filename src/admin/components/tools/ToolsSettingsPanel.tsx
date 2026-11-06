"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { publishToolsSettingsToCatalog } from "@/admin/lib/publishToolToCatalog";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { ToolsSettings } from "@/catalog/tools/types";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Reorder a pinned tool id in homepage deal curation (local; no homepageConfig). */
function movePinnedDealToolId(
  ids: string[],
  id: string,
  direction: -1 | 1,
): string[] {
  const next = [...ids];
  const index = next.indexOf(id);
  if (index < 0) return next;
  const j = index + direction;
  if (j < 0 || j >= next.length) return next;
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}

export function ToolsSettingsPanel() {
  const {
    toolsSettings,
    setToolsSettings,
    aiTools,
    hydrated,
    pushToast,
  } = useAdmin();
  const [draft, setDraft] = useState<ToolsSettings | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (hydrated) setDraft(structuredClone(toolsSettings));
  }, [hydrated, toolsSettings]);

  if (!hydrated || !draft) return null;

  const set = <K extends keyof ToolsSettings>(key: K, value: ToolsSettings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  const activeTools = aiTools
    .filter((t) => t.status === "active")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const pinned = draft.homepageDealToolIds ?? [];

  const togglePinned = (id: string) => {
    const next = pinned.includes(id)
      ? pinned.filter((x) => x !== id)
      : [...pinned, id];
    set("homepageDealToolIds", next);
  };

  const saveLocal = () => {
    setToolsSettings(draft, "Tools settings saved locally (draft)");
  };

  const publishSettings = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      setToolsSettings(draft, null);
      const result = await publishToolsSettingsToCatalog(draft);
      if (!result.ok) {
        pushToast(result.error, "error");
        return;
      }
      pushToast(result.message, result.dryRun ? "info" : "success");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AdminCard className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Tools settings
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Affiliate disclosure and homepage deal ranking. Save draft locally,
          then Publish to storefront so other browsers see the settings.
        </p>
      </div>

      <AdminToggle
        checked={draft.affiliateDisclosureEnabled}
        onChange={(v) => set("affiliateDisclosureEnabled", v)}
        label="Show affiliate disclosure"
      />
      <AdminField label="Disclosure text">
        <AdminTextarea
          value={draft.affiliateDisclosureText}
          onChange={(e) => set("affiliateDisclosureText", e.target.value)}
          rows={3}
        />
      </AdminField>

      <div className="border-t border-[var(--admin-border)] pt-4">
        <AdminToggle
          checked={draft.homepageDealsEnabled}
          onChange={(v) => set("homepageDealsEnabled", v)}
          label="Show homepage deals"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminField label="Min discount %">
          <AdminInput
            type="number"
            min={0}
            max={100}
            value={draft.homepageMinDiscountPercent}
            onChange={(e) =>
              set("homepageMinDiscountPercent", Number(e.target.value) || 0)
            }
          />
        </AdminField>
        <AdminField label="Max deals">
          <AdminInput
            type="number"
            min={1}
            max={12}
            value={draft.homepageMaxDeals}
            onChange={(e) =>
              set("homepageMaxDeals", Number(e.target.value) || 1)
            }
          />
        </AdminField>
      </div>
      <AdminToggle
        checked={draft.homepagePreferFeatured}
        onChange={(v) => set("homepagePreferFeatured", v)}
        label="Prefer featured tools (algorithmic fill)"
      />
      <AdminToggle
        checked={draft.homepageOnlyVerifiedDeals}
        onChange={(v) => set("homepageOnlyVerifiedDeals", v)}
        label="Only verified/manual deals (excludes imported/detected)"
      />
      <AdminToggle
        checked={draft.homepageAutoPromote}
        onChange={(v) => set("homepageAutoPromote", v)}
        label="Auto-promote detected sales (unused at launch — keep off)"
      />

      <AdminField label="Homepage deal ranking (optional pin order)">
        <p className="mb-2 text-[11px] text-[var(--admin-muted)]">
          Pin tools in display order. Unavailable or ineligible tools are
          skipped; remaining slots use algorithmic ranking.
        </p>
        {pinned.length > 0 ? (
          <ul className="mb-2 space-y-1 rounded-xl border border-[var(--admin-border)] p-2">
            {pinned.map((id) => {
              const tool = aiTools.find((t) => t.id === id);
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      aria-label="Move up"
                      onClick={() =>
                        set(
                          "homepageDealToolIds",
                          movePinnedDealToolId(pinned, id, -1),
                        )
                      }
                    >
                      <ArrowUp className="h-3 w-3 text-[var(--admin-muted)]" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      onClick={() =>
                        set(
                          "homepageDealToolIds",
                          movePinnedDealToolId(pinned, id, 1),
                        )
                      }
                    >
                      <ArrowDown className="h-3 w-3 text-[var(--admin-muted)]" />
                    </button>
                  </div>
                  <span className="min-w-0 flex-1 truncate">
                    {tool?.name ?? id}
                    {!tool ? (
                      <span className="ml-1 text-[10px] text-[var(--admin-muted)]">
                        (missing)
                      </span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    className="text-[11px] text-[var(--admin-muted)]"
                    onClick={() => togglePinned(id)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--admin-border)] p-2">
          {activeTools.length === 0 ? (
            <p className="px-1 py-2 text-xs text-[var(--admin-muted)]">
              No active tools in local CMS.
            </p>
          ) : (
            activeTools.map((tool) => {
              const checked = pinned.includes(tool.id);
              return (
                <label
                  key={tool.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--admin-surface-2)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePinned(tool.id)}
                  />
                  <span className="min-w-0 truncate">{tool.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[var(--admin-muted)]">
                    sort {tool.sortOrder}
                    {tool.featured ? " · featured" : ""}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </AdminField>

      <div className="flex flex-wrap gap-2">
        <AdminButton variant="secondary" onClick={saveLocal}>
          Save draft locally
        </AdminButton>
        <AdminButton
          variant="primary"
          disabled={publishing}
          onClick={() => void publishSettings()}
        >
          {publishing ? "Publishing…" : "Publish settings to storefront"}
        </AdminButton>
      </div>
    </AdminCard>
  );
}
