"use client";

import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/admin/components/ui/AdminField";
import type { PromptData } from "@/catalog/productPayloads";

export function PromptTypeEditor({
  data,
  onChange,
}: {
  data: PromptData;
  onChange: (d: PromptData) => void;
}) {
  const set = <K extends keyof PromptData>(key: K, value: PromptData[K]) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <AdminCard>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
        Prompt content
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Main prompt is protected after purchase and never shown publicly before
        buy.
      </p>
      <div className="grid gap-4">
        <AdminField
          label="Main prompt"
          hint="Protected — delivered only after purchase"
        >
          <AdminTextarea
            className="min-h-[140px]"
            value={data.mainPrompt}
            onChange={(e) => set("mainPrompt", e.target.value)}
            placeholder="Full generation prompt…"
          />
        </AdminField>
        <AdminField label="Negative prompt">
          <AdminTextarea
            value={data.negativePrompt ?? ""}
            onChange={(e) => set("negativePrompt", e.target.value)}
          />
        </AdminField>
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Generation settings">
            <AdminTextarea
              value={data.generationSettings ?? ""}
              onChange={(e) => set("generationSettings", e.target.value)}
              placeholder="CFG, steps, sampler…"
            />
          </AdminField>
          <AdminField label="Model notes">
            <AdminTextarea
              value={data.modelNotes ?? ""}
              onChange={(e) => set("modelNotes", e.target.value)}
              placeholder="Recommended models / checkpoints…"
            />
          </AdminField>
        </div>
        <AdminField label="Instructions">
          <AdminTextarea
            value={data.instructions ?? ""}
            onChange={(e) => set("instructions", e.target.value)}
          />
        </AdminField>
        <AdminField
          label="Public teaser"
          hint="Safe preview shown on the storefront before purchase"
        >
          <AdminTextarea
            value={data.publicTeaser ?? ""}
            onChange={(e) => set("publicTeaser", e.target.value)}
          />
        </AdminField>
        <AdminField label="Can generate" hint="Public — what buyers can create">
          <AdminTextarea
            value={data.canGenerate ?? ""}
            onChange={(e) => set("canGenerate", e.target.value)}
          />
        </AdminField>
        <AdminField label="Section count">
          <AdminInput
            type="number"
            min={1}
            value={data.sectionCount ?? 1}
            onChange={(e) => set("sectionCount", Number(e.target.value) || 1)}
          />
        </AdminField>
      </div>
    </AdminCard>
  );
}
