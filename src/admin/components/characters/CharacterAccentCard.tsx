"use client";

import { AdminField, AdminInput } from "@/admin/components/ui/AdminField";
import { cn } from "@/lib/utils";

const PRESETS = [
  { label: "Pink", value: "#e23d73" },
  { label: "Hot pink", value: "#FF5C8A" },
  { label: "Purple", value: "#7C6CFF" },
  { label: "Blue", value: "#5B8CFF" },
  { label: "Orange", value: "#FFB347" },
  { label: "Teal", value: "#3DD6C6" },
  { label: "Yellow", value: "#F5C542" },
];

function normalizeHex(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  return value;
}

export function CharacterAccentCard({
  accentColor,
  onChange,
}: {
  accentColor: string;
  onChange: (accentColor: string) => void;
}) {
  const current = accentColor || "#e23d73";

  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
        Character Accent
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Subtle highlights for badges, glows, and featured elements — not a full
        page theme.
      </p>

      <div className="mb-4 flex flex-wrap gap-2.5">
        {PRESETS.map((p) => {
          const active = current.toLowerCase() === p.value.toLowerCase();
          return (
            <button
              key={p.value}
              type="button"
              title={p.label}
              aria-label={p.label}
              onClick={() => onChange(p.value)}
              className={cn(
                "h-9 w-9 rounded-full border-2 transition",
                active
                  ? "scale-110 border-[var(--admin-text)]"
                  : "border-transparent hover:scale-105",
              )}
              style={{ background: p.value }}
            />
          );
        })}
      </div>

      <div className="flex items-end gap-3">
        <AdminField label="Custom">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(current) ? current : "#e23d73"}
              onChange={(e) => onChange(e.target.value)}
              className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--admin-border)] bg-transparent p-1"
            />
            <AdminInput
              value={current}
              onChange={(e) => onChange(normalizeHex(e.target.value))}
              placeholder="#e23d73"
              className="w-28 font-mono text-sm uppercase"
            />
          </div>
        </AdminField>
      </div>
    </div>
  );
}
