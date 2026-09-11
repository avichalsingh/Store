"use client";

import {
  AdminField,
  AdminInput,
  AdminTextarea,
} from "@/admin/components/ui/AdminField";
import type { AdminCharacter } from "@/admin/types";

export function CharacterAboutCard({
  draft,
  onChange,
}: {
  draft: AdminCharacter;
  onChange: (partial: Partial<AdminCharacter>) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
        About
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Short bio for cards and a fuller description for the character page.
      </p>
      <div className="space-y-3">
        <AdminField label="Short bio" hint="One or two lines for listings.">
          <AdminInput
            value={draft.shortBio}
            onChange={(e) => {
              const shortBio = e.target.value;
              onChange({
                shortBio,
                pageIntro:
                  !draft.pageIntro || draft.pageIntro === draft.shortBio
                    ? shortBio
                    : draft.pageIntro,
              });
            }}
            placeholder="Energetic, playful, always finding the beat."
          />
        </AdminField>
        <AdminField label="Description">
          <AdminTextarea
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Full character story and personality…"
          />
        </AdminField>
      </div>
    </div>
  );
}
