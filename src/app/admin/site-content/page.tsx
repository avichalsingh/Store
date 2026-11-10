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
import {
  DEFAULT_SITE_CONTENT,
  isAllowedSiteHref,
  isAllowedSocialHref,
  normalizeSiteContent,
  type SiteBadgeLabel,
  type SiteContentConfig,
  type SiteFaqItem,
  type SiteFooterLink,
  type SiteNavItem,
  type SitePromoCta,
} from "@/catalog/siteContent";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type TabId =
  | "navigation"
  | "footer"
  | "about"
  | "promos"
  | "badges";

const TABS: { id: TabId; label: string }[] = [
  { id: "navigation", label: "Navigation" },
  { id: "footer", label: "Footer" },
  { id: "about", label: "About / FAQ / Legal" },
  { id: "promos", label: "Promo CTAs" },
  { id: "badges", label: "Badges" },
];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, order) => ({ ...item, order }));
}

function moveItem<T>(items: T[], index: number, dir: -1 | 1): T[] {
  const j = index + dir;
  if (j < 0 || j >= items.length) return items;
  const next = [...items];
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}

export default function SiteContentPage() {
  const { siteContent, setSiteContent, hydrated } = useAdmin();
  const [draft, setDraft] = useState<SiteContentConfig | null>(null);
  const [base, setBase] = useState("");
  const [tab, setTab] = useState<TabId>("navigation");

  useEffect(() => {
    if (!hydrated) return;
    const next = normalizeSiteContent(siteContent ?? DEFAULT_SITE_CONTENT);
    setDraft(next);
    setBase(JSON.stringify(next));
  }, [hydrated, siteContent]);

  const dirty = useMemo(
    () => !!draft && JSON.stringify(draft) !== base,
    [draft, base],
  );

  if (!hydrated || !draft) return null;

  const save = () => {
    const normalized = normalizeSiteContent(draft);
    setSiteContent(normalized, "Site content saved");
    setDraft(normalized);
    setBase(JSON.stringify(normalized));
  };

  const discard = () => {
    const next = normalizeSiteContent(JSON.parse(base) as SiteContentConfig);
    setDraft(next);
  };

  const patch = (updater: (prev: SiteContentConfig) => SiteContentConfig) => {
    setDraft((prev) => (prev ? updater(prev) : prev));
  };

  return (
    <div className="space-y-6 pb-24">
      <AdminPageHeader
        title="Site Content"
        description="Manage navigation, footer, About/FAQ/legal copy, promo CTAs, and badge labels. Layout and styling stay code-controlled. Legal edits are not legal approval."
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={
              tab === t.id
                ? "rounded-full bg-accent px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-text-dim hover:text-text"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "navigation" && (
        <NavigationPanel draft={draft} patch={patch} />
      )}
      {tab === "footer" && <FooterPanel draft={draft} patch={patch} />}
      {tab === "about" && <AboutPanel draft={draft} patch={patch} />}
      {tab === "promos" && <PromosPanel draft={draft} patch={patch} />}
      {tab === "badges" && <BadgesPanel draft={draft} patch={patch} />}

      <AdminSaveBar
        dirty={dirty}
        onSave={save}
        onDiscard={discard}
        savingLabel="Save site content"
      />
    </div>
  );
}

function NavListEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: SiteNavItem[];
  onChange: (items: SiteNavItem[]) => void;
}) {
  const ordered = reindex([...items].sort((a, b) => a.order - b.order));

  const update = (id: string, patch: Partial<SiteNavItem>) => {
    onChange(
      reindex(
        ordered.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      ),
    );
  };

  return (
    <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">{title}</h2>
      <div className="space-y-3">
        {ordered.map((item, index) => {
          const hrefOk = isAllowedSiteHref(item.href);
          return (
            <div
              key={item.id}
              className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <AdminField label="Label">
                <AdminInput
                  value={item.label}
                  onChange={(e) => update(item.id, { label: e.target.value })}
                />
              </AdminField>
              <AdminField
                label="URL / route"
                hint={
                  hrefOk
                    ? undefined
                    : "Invalid destination — storefront will hide or fall back"
                }
              >
                <AdminInput
                  value={item.href}
                  onChange={(e) => update(item.id, { href: e.target.value })}
                  className={!hrefOk ? "border-red-400" : undefined}
                />
              </AdminField>
              <AdminField label="Visible">
                <AdminToggle
                  checked={item.enabled}
                  onChange={(enabled) => update(item.id, { enabled })}
                />
              </AdminField>
              <div className="flex items-end gap-1">
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Move up"
                  onClick={() =>
                    onChange(reindex(moveItem(ordered, index, -1)))
                  }
                >
                  <ArrowUp size={14} />
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Move down"
                  onClick={() =>
                    onChange(reindex(moveItem(ordered, index, 1)))
                  }
                >
                  <ArrowDown size={14} />
                </AdminButton>
                <AdminButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Remove"
                  onClick={() =>
                    onChange(
                      reindex(ordered.filter((x) => x.id !== item.id)),
                    )
                  }
                >
                  <Trash2 size={14} />
                </AdminButton>
              </div>
            </div>
          );
        })}
        <AdminButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            onChange(
              reindex([
                ...ordered,
                {
                  id: newId("nav"),
                  label: "New link",
                  href: "/explore",
                  enabled: true,
                  order: ordered.length,
                },
              ]),
            )
          }
        >
          <Plus size={14} /> Add item
        </AdminButton>
      </div>
    </AdminCard>
  );
}

function NavigationPanel({
  draft,
  patch,
}: {
  draft: SiteContentConfig;
  patch: (u: (prev: SiteContentConfig) => SiteContentConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">More menu</h2>
        <AdminField label="More dropdown label">
          <AdminInput
            value={draft.navigation.moreLabel}
            onChange={(e) =>
              patch((prev) => ({
                ...prev,
                navigation: {
                  ...prev.navigation,
                  moreLabel: e.target.value,
                },
              }))
            }
          />
        </AdminField>
        <p className="mt-2 text-xs text-muted">
          Allowed destinations: public catalog routes (e.g. /explore, /videos)
          or http(s) URLs. /admin and /api paths are blocked.
        </p>
      </AdminCard>
      <NavListEditor
        title="Primary links"
        items={draft.navigation.primary}
        onChange={(primary) =>
          patch((prev) => ({
            ...prev,
            navigation: { ...prev.navigation, primary },
          }))
        }
      />
      <NavListEditor
        title="More dropdown links"
        items={draft.navigation.more}
        onChange={(more) =>
          patch((prev) => ({
            ...prev,
            navigation: { ...prev.navigation, more },
          }))
        }
      />
    </div>
  );
}

function FooterLinkEditor({
  links,
  onChange,
}: {
  links: SiteFooterLink[];
  onChange: (links: SiteFooterLink[]) => void;
}) {
  const ordered = reindex([...links].sort((a, b) => a.order - b.order));
  return (
    <div className="space-y-2">
      {ordered.map((link, index) => {
        const hrefOk = isAllowedSiteHref(link.href);
        return (
          <div
            key={link.id}
            className="grid gap-2 rounded-lg border border-border/70 p-2 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <AdminInput
              value={link.label}
              placeholder="Label"
              onChange={(e) =>
                onChange(
                  reindex(
                    ordered.map((l) =>
                      l.id === link.id
                        ? { ...l, label: e.target.value }
                        : l,
                    ),
                  ),
                )
              }
            />
            <AdminInput
              value={link.href}
              placeholder="/path or https://"
              className={!hrefOk ? "border-red-400" : undefined}
              onChange={(e) =>
                onChange(
                  reindex(
                    ordered.map((l) =>
                      l.id === link.id ? { ...l, href: e.target.value } : l,
                    ),
                  ),
                )
              }
            />
            <AdminToggle
              checked={link.enabled}
              onChange={(enabled) =>
                onChange(
                  reindex(
                    ordered.map((l) =>
                      l.id === link.id ? { ...l, enabled } : l,
                    ),
                  ),
                )
              }
            />
            <div className="flex gap-1">
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange(reindex(moveItem(ordered, index, -1)))
                }
              >
                <ArrowUp size={14} />
              </AdminButton>
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(reindex(moveItem(ordered, index, 1)))}
              >
                <ArrowDown size={14} />
              </AdminButton>
              <AdminButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange(
                    reindex(ordered.filter((l) => l.id !== link.id)),
                  )
                }
              >
                <Trash2 size={14} />
              </AdminButton>
            </div>
          </div>
        );
      })}
      <AdminButton
        type="button"
        variant="secondary"
        size="sm"
        onClick={() =>
          onChange(
            reindex([
              ...ordered,
              {
                id: newId("flink"),
                label: "New link",
                href: "/explore",
                enabled: true,
                order: ordered.length,
              },
            ]),
          )
        }
      >
        <Plus size={14} /> Add link
      </AdminButton>
    </div>
  );
}

function FooterPanel({
  draft,
  patch,
}: {
  draft: SiteContentConfig;
  patch: (u: (prev: SiteContentConfig) => SiteContentConfig) => void;
}) {
  const f = draft.footer;
  return (
    <div className="space-y-4">
      <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">Brand & copyright</h2>
        <div className="space-y-3">
          <AdminField label="Tagline">
            <AdminTextarea
              rows={3}
              value={f.tagline}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, tagline: e.target.value },
                }))
              }
            />
          </AdminField>
          <AdminField label="Follow label">
            <AdminInput
              value={f.followLabel}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, followLabel: e.target.value },
                }))
              }
            />
          </AdminField>
          <AdminField
            label="Copyright"
            hint="Use {year} for the current year"
          >
            <AdminInput
              value={f.copyright}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, copyright: e.target.value },
                }))
              }
            />
          </AdminField>
          <AdminField label="Secondary line">
            <AdminInput
              value={f.secondaryLine}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  footer: { ...prev.footer, secondaryLine: e.target.value },
                }))
              }
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">Social profiles</h2>
        <p className="mb-3 text-xs text-muted">
          Leave URL empty to hide. Only http(s) links are shown on the
          storefront.
        </p>
        <div className="space-y-3">
          {f.social.map((s) => {
            const ok = !s.href.trim() || isAllowedSocialHref(s.href);
            return (
              <div
                key={s.id}
                className="grid gap-2 sm:grid-cols-[120px_1fr_1fr_auto]"
              >
                <p className="self-center text-sm font-medium capitalize">
                  {s.id}
                </p>
                <AdminInput
                  value={s.label}
                  placeholder="Label"
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        social: prev.footer.social.map((x) =>
                          x.id === s.id
                            ? { ...x, label: e.target.value }
                            : x,
                        ),
                      },
                    }))
                  }
                />
                <AdminInput
                  value={s.href}
                  placeholder="https://…"
                  className={!ok ? "border-red-400" : undefined}
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        social: prev.footer.social.map((x) =>
                          x.id === s.id
                            ? {
                                ...x,
                                href: e.target.value,
                                enabled: Boolean(e.target.value.trim()),
                              }
                            : x,
                        ),
                      },
                    }))
                  }
                />
                <AdminToggle
                  checked={s.enabled}
                  onChange={(enabled) =>
                    patch((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        social: prev.footer.social.map((x) =>
                          x.id === s.id ? { ...x, enabled } : x,
                        ),
                      },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </AdminCard>

      {f.groups.map((group) => (
        <AdminCard key={group.id}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">
            {group.title} links
          </h2>
          <AdminField label="Group title">
            <AdminInput
              value={group.title}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  footer: {
                    ...prev.footer,
                    groups: prev.footer.groups.map((g) =>
                      g.id === group.id
                        ? { ...g, title: e.target.value }
                        : g,
                    ),
                  },
                }))
              }
            />
          </AdminField>
          <div className="mt-3">
            <FooterLinkEditor
              links={group.links}
              onChange={(links) =>
                patch((prev) => ({
                  ...prev,
                  footer: {
                    ...prev.footer,
                    groups: prev.footer.groups.map((g) =>
                      g.id === group.id ? { ...g, links } : g,
                    ),
                  },
                }))
              }
            />
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function AboutPanel({
  draft,
  patch,
}: {
  draft: SiteContentConfig;
  patch: (u: (prev: SiteContentConfig) => SiteContentConfig) => void;
}) {
  const about = draft.about;
  const faqs = reindex(
    [...about.faqItems].sort((a, b) => a.order - b.order),
  );

  return (
    <div className="space-y-4">
      <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">About intro</h2>
        <div className="space-y-3">
          <AdminField label="Eyebrow">
            <AdminInput
              value={about.eyebrow}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  about: { ...prev.about, eyebrow: e.target.value },
                }))
              }
            />
          </AdminField>
          <AdminField label="Title">
            <AdminInput
              value={about.title}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  about: { ...prev.about, title: e.target.value },
                }))
              }
            />
          </AdminField>
          <AdminField label="Intro">
            <AdminTextarea
              rows={4}
              value={about.intro}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  about: { ...prev.about, intro: e.target.value },
                }))
              }
            />
          </AdminField>
        </div>
      </AdminCard>

      <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">FAQ entries</h2>
        <p className="mb-3 text-xs text-muted">
          Plain text only. Shown under the FAQ section on /about#faq.
        </p>
        <div className="space-y-3">
          {faqs.map((item, index) => (
            <div
              key={item.id}
              className="space-y-2 rounded-xl border border-border p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <AdminToggle
                  checked={item.enabled}
                  onChange={(enabled) =>
                    patch((prev) => ({
                      ...prev,
                      about: {
                        ...prev.about,
                        faqItems: reindex(
                          faqs.map((f) =>
                            f.id === item.id ? { ...f, enabled } : f,
                          ),
                        ),
                      },
                    }))
                  }
                />
                <div className="flex gap-1">
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        about: {
                          ...prev.about,
                          faqItems: reindex(moveItem(faqs, index, -1)),
                        },
                      }))
                    }
                  >
                    <ArrowUp size={14} />
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        about: {
                          ...prev.about,
                          faqItems: reindex(moveItem(faqs, index, 1)),
                        },
                      }))
                    }
                  >
                    <ArrowDown size={14} />
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      patch((prev) => ({
                        ...prev,
                        about: {
                          ...prev.about,
                          faqItems: reindex(
                            faqs.filter((f) => f.id !== item.id),
                          ),
                        },
                      }))
                    }
                  >
                    <Trash2 size={14} />
                  </AdminButton>
                </div>
              </div>
              <AdminField label="Question">
                <AdminInput
                  value={item.question}
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      about: {
                        ...prev.about,
                        faqItems: faqs.map((f) =>
                          f.id === item.id
                            ? { ...f, question: e.target.value }
                            : f,
                        ),
                      },
                    }))
                  }
                />
              </AdminField>
              <AdminField label="Answer">
                <AdminTextarea
                  rows={3}
                  value={item.answer}
                  onChange={(e) =>
                    patch((prev) => ({
                      ...prev,
                      about: {
                        ...prev.about,
                        faqItems: faqs.map((f) =>
                          f.id === item.id
                            ? { ...f, answer: e.target.value }
                            : f,
                        ),
                      },
                    }))
                  }
                />
              </AdminField>
            </div>
          ))}
          <AdminButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              const next: SiteFaqItem = {
                id: newId("faq"),
                question: "New question",
                answer: "",
                enabled: true,
                order: faqs.length,
              };
              patch((prev) => ({
                ...prev,
                about: {
                  ...prev.about,
                  faqItems: reindex([...faqs, next]),
                },
              }));
            }}
          >
            <Plus size={14} /> Add FAQ
          </AdminButton>
        </div>
      </AdminCard>

      {about.sections.map((section) => (
        <AdminCard key={section.id}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">
            {section.heading} ({section.id})
          </h2>
          <div className="space-y-3">
            <AdminToggle
              checked={section.enabled}
              onChange={(enabled) =>
                patch((prev) => ({
                  ...prev,
                  about: {
                    ...prev.about,
                    sections: prev.about.sections.map((s) =>
                      s.id === section.id ? { ...s, enabled } : s,
                    ),
                  },
                }))
              }
            />
            <AdminField label="Heading">
              <AdminInput
                value={section.heading}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    about: {
                      ...prev.about,
                      sections: prev.about.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, heading: e.target.value }
                          : s,
                      ),
                    },
                  }))
                }
              />
            </AdminField>
            <AdminField
              label="Body"
              hint={
                section.id === "faq"
                  ? "Fallback body when FAQ list is empty. Plain text only."
                  : "Plain text only. Not legal approval."
              }
            >
              <AdminTextarea
                rows={4}
                value={section.body}
                onChange={(e) =>
                  patch((prev) => ({
                    ...prev,
                    about: {
                      ...prev.about,
                      sections: prev.about.sections.map((s) =>
                        s.id === section.id
                          ? { ...s, body: e.target.value }
                          : s,
                      ),
                    },
                  }))
                }
              />
            </AdminField>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}

function PromosPanel({
  draft,
  patch,
}: {
  draft: SiteContentConfig;
  patch: (u: (prev: SiteContentConfig) => SiteContentConfig) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Early Access and Newsletter sections keep their existing design. Leave
        CTA URL empty to keep the email-form behavior. Homepage Final CTA
        remains under Homepage CMS.
      </p>
      {draft.promoCtas.map((promo) => (
        <PromoEditor
          key={promo.id}
          promo={promo}
          onChange={(next) =>
            patch((prev) => ({
              ...prev,
              promoCtas: prev.promoCtas.map((p) =>
                p.id === next.id ? next : p,
              ),
            }))
          }
        />
      ))}
    </div>
  );
}

function PromoEditor({
  promo,
  onChange,
}: {
  promo: SitePromoCta;
  onChange: (p: SitePromoCta) => void;
}) {
  const href = promo.ctaHref?.trim() ?? "";
  const hrefOk = !href || isAllowedSiteHref(href);
  return (
    <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">{promo.id}</h2>
      <div className="space-y-3">
        <AdminToggle
          checked={promo.enabled}
          onChange={(enabled) => onChange({ ...promo, enabled })}
        />
        <AdminField label="Eyebrow">
          <AdminInput
            value={promo.eyebrow ?? ""}
            onChange={(e) => onChange({ ...promo, eyebrow: e.target.value })}
          />
        </AdminField>
        <AdminField label="Heading">
          <AdminInput
            value={promo.title}
            onChange={(e) => onChange({ ...promo, title: e.target.value })}
          />
        </AdminField>
        <AdminField label="Supporting text">
          <AdminTextarea
            rows={3}
            value={promo.description}
            onChange={(e) =>
              onChange({ ...promo, description: e.target.value })
            }
          />
        </AdminField>
        <AdminField label="Button label">
          <AdminInput
            value={promo.ctaLabel}
            onChange={(e) => onChange({ ...promo, ctaLabel: e.target.value })}
          />
        </AdminField>
        <AdminField
          label="Destination URL (optional)"
          hint={
            hrefOk
              ? "Empty = email capture form"
              : "Invalid destination — will fall back on save"
          }
        >
          <AdminInput
            value={href}
            className={!hrefOk ? "border-red-400" : undefined}
            onChange={(e) => onChange({ ...promo, ctaHref: e.target.value })}
          />
        </AdminField>
        <AdminField label="Footnote">
          <AdminInput
            value={promo.footnote ?? ""}
            onChange={(e) => onChange({ ...promo, footnote: e.target.value })}
          />
        </AdminField>
        <AdminField label="Success message">
          <AdminInput
            value={promo.successMessage ?? ""}
            onChange={(e) =>
              onChange({ ...promo, successMessage: e.target.value })
            }
          />
        </AdminField>
      </div>
    </AdminCard>
  );
}

function BadgesPanel({
  draft,
  patch,
}: {
  draft: SiteContentConfig;
  patch: (u: (prev: SiteContentConfig) => SiteContentConfig) => void;
}) {
  return (
    <AdminCard>
      <h2 className="mb-3 text-sm font-semibold text-[var(--admin-text)]">Reusable badge labels</h2>
      <p className="mb-3 text-xs text-muted">
        Text, visibility, and tone only. Colors and layout stay in the design
        system. Product performance badges remain separate.
      </p>
      <div className="space-y-3">
        {draft.badges.map((badge) => (
          <div
            key={badge.id}
            className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[100px_1fr_140px_auto]"
          >
            <p className="self-center text-sm font-medium capitalize">
              {badge.id}
            </p>
            <AdminInput
              value={badge.text}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  badges: prev.badges.map((b) =>
                    b.id === badge.id
                      ? { ...b, text: e.target.value }
                      : b,
                  ),
                }))
              }
            />
            <AdminSelect
              value={badge.tone}
              onChange={(e) =>
                patch((prev) => ({
                  ...prev,
                  badges: prev.badges.map((b) =>
                    b.id === badge.id
                      ? {
                          ...b,
                          tone: e.target.value as SiteBadgeLabel["tone"],
                        }
                      : b,
                  ),
                }))
              }
            >
              <option value="accent">accent</option>
              <option value="neutral">neutral</option>
              <option value="soft">soft</option>
            </AdminSelect>
            <AdminToggle
              checked={badge.enabled}
              onChange={(enabled) =>
                patch((prev) => ({
                  ...prev,
                  badges: prev.badges.map((b) =>
                    b.id === badge.id ? { ...b, enabled } : b,
                  ),
                }))
              }
            />
          </div>
        ))}
      </div>
    </AdminCard>
  );
}
