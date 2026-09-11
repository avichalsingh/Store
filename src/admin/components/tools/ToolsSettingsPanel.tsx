"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { ToolsSettings } from "@/catalog/tools/types";
import { useEffect, useState } from "react";

export function ToolsSettingsPanel() {
  const { toolsSettings, setToolsSettings, hydrated } = useAdmin();
  const [draft, setDraft] = useState<ToolsSettings | null>(null);

  useEffect(() => {
    if (hydrated) setDraft(structuredClone(toolsSettings));
  }, [hydrated, toolsSettings]);

  if (!hydrated || !draft) return null;

  const set = <K extends keyof ToolsSettings>(key: K, value: ToolsSettings[K]) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  };

  return (
    <AdminCard className="space-y-4">
      <div>
        <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Tools settings
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Affiliate disclosure and homepage deal rules for the Tools surface.
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
        label="Prefer featured tools"
      />
      <AdminToggle
        checked={draft.homepageOnlyVerifiedDeals}
        onChange={(v) => set("homepageOnlyVerifiedDeals", v)}
        label="Only verified deals"
      />
      <AdminToggle
        checked={draft.homepageAutoPromote}
        onChange={(v) => set("homepageAutoPromote", v)}
        label="Auto-promote detected sales"
      />

      <AdminButton
        variant="primary"
        onClick={() => setToolsSettings(draft)}
      >
        Save tools settings
      </AdminButton>
    </AdminCard>
  );
}
