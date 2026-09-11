"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminSaveBar } from "@/admin/components/ui/AdminSaveBar";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { HomepageHeroConfig, HomepageSection } from "@/admin/types";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function HomepagePage() {
  const {
    homepageSections,
    homepageHero,
    products,
    setHomepageSections,
    setHomepageHero,
    hydrated,
  } = useAdmin();
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [hero, setHero] = useState<HomepageHeroConfig | null>(null);
  const [baseSections, setBaseSections] = useState("");
  const [baseHero, setBaseHero] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    setSections(structuredClone(homepageSections));
    setHero(structuredClone(homepageHero));
    setBaseSections(JSON.stringify(homepageSections));
    setBaseHero(JSON.stringify(homepageHero));
  }, [hydrated, homepageSections, homepageHero]);

  const dirty = useMemo(
    () =>
      !!hero &&
      (JSON.stringify(sections) !== baseSections || JSON.stringify(hero) !== baseHero),
    [sections, hero, baseSections, baseHero],
  );

  if (!hydrated || !hero) return null;

  const move = (index: number, dir: -1 | 1) => {
    const next = [...sections].sort((a, b) => a.order - b.order);
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    const tmp = next[index];
    next[index] = next[j];
    next[j] = tmp;
    setSections(next.map((s, i) => ({ ...s, order: i })));
  };

  const save = () => {
    setHomepageSections(sections, null);
    setHomepageHero(hero, "Homepage saved");
    setBaseSections(JSON.stringify(sections));
    setBaseHero(JSON.stringify(hero));
  };

  const ordered = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="pb-16">
      <AdminPageHeader
        title="Homepage"
        description="Control section visibility, order, and hero copy."
        actions={
          <AdminButton variant="primary" onClick={save} disabled={!dirty}>
            Save homepage
          </AdminButton>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
            Sections
          </h2>
          <ul className="space-y-2">
            {ordered.map((s, i) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] px-3 py-2.5"
              >
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => move(i, -1)} aria-label="Move up">
                    <ArrowUp className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} aria-label="Move down">
                    <ArrowDown className="h-3.5 w-3.5 text-[var(--admin-muted)]" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-[11px] text-[var(--admin-muted)]">{s.id}</p>
                </div>
                <AdminToggle
                  checked={s.enabled}
                  onChange={(enabled) =>
                    setSections((prev) =>
                      prev.map((x) => (x.id === s.id ? { ...x, enabled } : x)),
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
            Hero editor
          </h2>
          <div className="space-y-3">
            <AdminField label="Eyebrow">
              <AdminInput
                value={hero.eyebrow}
                onChange={(e) => setHero({ ...hero, eyebrow: e.target.value })}
              />
            </AdminField>
            <AdminField label="Headline">
              <AdminInput
                value={hero.headline}
                onChange={(e) => setHero({ ...hero, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Supporting text">
              <AdminTextarea
                value={hero.supportingText}
                onChange={(e) => setHero({ ...hero, supportingText: e.target.value })}
              />
            </AdminField>
            <AdminField label="Featured product">
              <AdminSelect
                value={hero.featuredProductId}
                onChange={(e) =>
                  setHero({ ...hero, featuredProductId: e.target.value })
                }
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="CTA text">
                <AdminInput
                  value={hero.ctaText}
                  onChange={(e) => setHero({ ...hero, ctaText: e.target.value })}
                />
              </AdminField>
              <AdminField label="CTA href">
                <AdminInput
                  value={hero.ctaHref}
                  onChange={(e) => setHero({ ...hero, ctaHref: e.target.value })}
                />
              </AdminField>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminSaveBar dirty={dirty} onSave={save} savingLabel="Save homepage" />
    </div>
  );
}
