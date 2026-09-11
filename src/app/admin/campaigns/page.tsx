"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { formatDate, uid } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminCampaign, Announcement } from "@/admin/types";
import { useState } from "react";

const emptyCampaign = (): AdminCampaign => ({
  id: uid("camp"),
  name: "",
  type: "Product spotlight",
  badge: "New",
  accent: "#e23d73",
  headline: "",
  description: "",
  ctaText: "Shop now",
  productIds: [],
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
  status: "draft",
});

export default function CampaignsPage() {
  const {
    campaigns,
    announcements,
    products,
    upsertCampaign,
    deleteCampaign,
    upsertAnnouncement,
    deleteAnnouncement,
    hydrated,
  } = useAdmin();
  const [editing, setEditing] = useState<AdminCampaign | null>(null);
  const [annDraft, setAnnDraft] = useState("");

  if (!hydrated) return null;

  return (
    <div>
      <AdminPageHeader
        title="Trending & Campaigns"
        description="Spotlight campaigns and site announcements."
        actions={
          <AdminButton variant="primary" onClick={() => setEditing(emptyCampaign())}>
            New campaign
          </AdminButton>
        }
      />

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setEditing(structuredClone(c))}
            className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 text-left shadow-[var(--admin-shadow-sm)]"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ background: c.accent }}
              >
                {c.badge}
              </span>
              <StatusBadge status={c.status} />
            </div>
            <p className="font-[family-name:var(--font-syne)] font-semibold">{c.name}</p>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">{c.headline}</p>
            <p className="mt-3 text-[11px] text-[var(--admin-muted)]">
              {formatDate(c.startDate)} → {formatDate(c.endDate)} · {c.productIds.length}{" "}
              products
            </p>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-5">
        <h2 className="mb-4 font-[family-name:var(--font-syne)] text-base font-semibold">
          Announcements
        </h2>
        <div className="mb-4 flex gap-2">
          <AdminInput
            placeholder="New announcement message…"
            value={annDraft}
            onChange={(e) => setAnnDraft(e.target.value)}
          />
          <AdminButton
            variant="primary"
            onClick={() => {
              if (!annDraft.trim()) return;
              const a: Announcement = {
                id: uid("ann"),
                message: annDraft.trim(),
                enabled: true,
                order: announcements.length,
              };
              upsertAnnouncement(a, "Announcement added");
              setAnnDraft("");
            }}
          >
            Add
          </AdminButton>
        </div>
        <ul className="space-y-2">
          {announcements
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--admin-border)] px-3 py-2.5"
              >
                <p className="min-w-0 flex-1 text-sm">{a.message}</p>
                <AdminToggle
                  checked={a.enabled}
                  onChange={(enabled) => upsertAnnouncement({ ...a, enabled }, "Updated")}
                />
                <AdminButton
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAnnouncement(a.id)}
                >
                  Remove
                </AdminButton>
              </li>
            ))}
        </ul>
      </div>

      <AdminModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Campaign"
        wide
        footer={
          editing ? (
            <>
              {campaigns.some((c) => c.id === editing.id) ? (
                <AdminButton
                  variant="danger"
                  onClick={() => {
                    deleteCampaign(editing.id);
                    setEditing(null);
                  }}
                >
                  Delete
                </AdminButton>
              ) : null}
              <AdminButton variant="secondary" onClick={() => setEditing(null)}>
                Cancel
              </AdminButton>
              <AdminButton
                variant="primary"
                onClick={() => {
                  upsertCampaign(editing);
                  setEditing(null);
                }}
              >
                Save
              </AdminButton>
            </>
          ) : null
        }
      >
        {editing ? (
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="Name">
              <AdminInput
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              />
            </AdminField>
            <AdminField label="Type">
              <AdminInput
                value={editing.type}
                onChange={(e) => setEditing({ ...editing, type: e.target.value })}
              />
            </AdminField>
            <AdminField label="Badge">
              <AdminInput
                value={editing.badge}
                onChange={(e) => setEditing({ ...editing, badge: e.target.value })}
              />
            </AdminField>
            <AdminField label="Accent">
              <AdminInput
                type="color"
                value={editing.accent}
                onChange={(e) => setEditing({ ...editing, accent: e.target.value })}
              />
            </AdminField>
            <AdminField label="Headline" className="md:col-span-2">
              <AdminInput
                value={editing.headline}
                onChange={(e) => setEditing({ ...editing, headline: e.target.value })}
              />
            </AdminField>
            <AdminField label="Description" className="md:col-span-2">
              <AdminTextarea
                value={editing.description}
                onChange={(e) =>
                  setEditing({ ...editing, description: e.target.value })
                }
              />
            </AdminField>
            <AdminField label="CTA">
              <AdminInput
                value={editing.ctaText}
                onChange={(e) => setEditing({ ...editing, ctaText: e.target.value })}
              />
            </AdminField>
            <AdminField label="Status">
              <AdminSelect
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as AdminCampaign["status"],
                  })
                }
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </AdminSelect>
            </AdminField>
            <div className="md:col-span-2">
              <p className="mb-2 text-xs font-medium text-[var(--admin-muted)]">
                Products
              </p>
              <div className="flex flex-wrap gap-2">
                {products.map((p) => {
                  const on = editing.productIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setEditing({
                          ...editing,
                          productIds: on
                            ? editing.productIds.filter((id) => id !== p.id)
                            : [...editing.productIds, p.id],
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-xs ${
                        on
                          ? "border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]"
                          : "border-[var(--admin-border)] text-[var(--admin-muted)]"
                      }`}
                    >
                      {p.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
