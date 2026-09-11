"use client";

import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import type { AdminCharacter, AdminCharacterStatus } from "@/admin/types";
import { slugify } from "@/admin/lib/format";

export function CharacterIdentityCard({
  draft,
  slugTouched,
  onSlugTouched,
  onChange,
}: {
  draft: AdminCharacter;
  slugTouched: boolean;
  onSlugTouched: () => void;
  onChange: (partial: Partial<AdminCharacter>) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 font-[family-name:var(--font-syne)] text-base font-semibold">
        Character Identity
      </h2>
      <p className="mb-4 text-xs text-[var(--admin-muted)]">
        Name, public URL, and publishing status.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <AdminField label="Character Name" hint="Shown across the storefront and admin.">
          <AdminInput
            value={draft.name}
            onChange={(e) => {
              const name = e.target.value;
              onChange({
                name,
                slug: slugTouched ? draft.slug : slugify(name),
                pageHeadline:
                  draft.pageHeadline === `Meet ${draft.name}` || !draft.pageHeadline
                    ? name
                      ? `Meet ${name}`
                      : ""
                    : draft.pageHeadline,
              });
            }}
            placeholder="Milo"
          />
        </AdminField>
        <AdminField
          label="Slug"
          hint={`Controls the public URL — rhythm.store/characters/${draft.slug || "slug"}`}
        >
          <AdminInput
            value={draft.slug}
            onChange={(e) => {
              onSlugTouched();
              onChange({ slug: e.target.value });
            }}
            placeholder="milo"
          />
        </AdminField>
        <AdminField label="Status">
          <AdminSelect
            value={draft.status}
            onChange={(e) =>
              onChange({
                status: e.target.value as AdminCharacterStatus,
              })
            }
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="archived">Archived</option>
          </AdminSelect>
        </AdminField>
        <div className="flex items-end pb-2">
          <AdminToggle
            checked={draft.featured}
            onChange={(featured) =>
              onChange({ featured, showOnCharactersPage: featured ? true : draft.showOnCharactersPage })
            }
            label="Featured Character"
          />
        </div>
      </div>
    </div>
  );
}
