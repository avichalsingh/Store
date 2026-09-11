"use client";

import { AdminButton } from "@/admin/components/ui/AdminButton";
import { StatusBadge } from "@/admin/components/ui/AdminBadge";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
} from "@/admin/components/ui/AdminField";
import { AdminModal } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminTabs } from "@/admin/components/ui/AdminTabs";
import { ImagePdpSettingsPanel } from "@/admin/components/products/ImagePdpSettingsPanel";
import { discountPct, formatDate, formatInr, formatUsd, uid } from "@/admin/lib/format";
import { useAdmin } from "@/admin/store/AdminProvider";
import type { AdminOffer, OfferStatus } from "@/admin/types";
import type { ImagePdpGlobalSettings } from "@/catalog/imagePdpTypes";
import { useMemo, useState } from "react";

export default function PricingPage() {
  const {
    offers,
    products,
    upsertOffer,
    deleteOffer,
    imagePdpSettings,
    setImagePdpSettings,
    hydrated,
  } = useAdmin();
  const [section, setSection] = useState<"offers" | "image-pdp">("offers");
  const [tab, setTab] = useState<OfferStatus | "all">("active");
  const [editing, setEditing] = useState<AdminOffer | null>(null);
  const [imagePdpDraft, setImagePdpDraft] =
    useState<ImagePdpGlobalSettings | null>(null);

  const filtered = useMemo(() => {
    if (tab === "all") return offers;
    return offers.filter((o) => o.status === tab);
  }, [offers, tab]);

  if (!hydrated) return null;

  const pdpSettings = imagePdpDraft ?? imagePdpSettings;

  const empty = (): AdminOffer => {
    const p = products[0];
    return {
      id: uid("offer"),
      productId: p?.id ?? "",
      productName: p?.name ?? "",
      currency: "INR",
      regularPrice: p?.pricing.INR.regularPrice ?? 999,
      currentPrice: p?.pricing.INR.currentPrice ?? 799,
      discountPct: 20,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      status: "upcoming",
    };
  };

  return (
    <div>
      <AdminPageHeader
        title="Pricing & Offers"
        description="Independent INR / USD markets with timed discounts."
        actions={
          <AdminButton variant="primary" onClick={() => setEditing(empty())}>
            Create offer
          </AdminButton>
        }
      />

      <div className="mb-6">
        <AdminTabs
          tabs={[
            { id: "offers", label: "Offers" },
            { id: "image-pdp", label: "Image PDP bundles" },
          ]}
          value={section}
          onChange={setSection}
        />
      </div>

      {section === "image-pdp" ? (
        <ImagePdpSettingsPanel
          settings={pdpSettings}
          onChange={setImagePdpDraft}
          onSave={() => {
            setImagePdpSettings(pdpSettings);
            setImagePdpDraft(null);
          }}
        />
      ) : (
        <>
      <AdminCard className="mb-6">
        <h2 className="mb-2 font-[family-name:var(--font-syne)] text-base font-semibold">
          Global pricing note
        </h2>
        <p className="text-sm text-[var(--admin-muted)]">
          INR and USD prices are independent markets — never convert between them.
          Offers here sync conceptually with product-level offer toggles in the product
          editor. Storefront region selector reads current prices per market.
        </p>
      </AdminCard>

      <div className="mb-4">
        <AdminTabs
          tabs={[
            { id: "active", label: "Active" },
            { id: "upcoming", label: "Upcoming" },
            { id: "expired", label: "Expired" },
            { id: "all", label: "All" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <ul>
          {filtered.map((o) => (
            <li
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] px-4 py-3 last:border-0"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{o.productName}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-xs text-[var(--admin-muted)]">
                  {formatDate(o.startDate)} → {formatDate(o.endDate)} · {o.discountPct}% off
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm">
                  <span className="text-[var(--admin-muted)] line-through">
                    {o.currency === "INR"
                      ? formatInr(o.regularPrice)
                      : formatUsd(o.regularPrice)}
                  </span>{" "}
                  <span className="font-medium text-[var(--admin-accent)]">
                    {o.currency === "INR"
                      ? formatInr(o.currentPrice)
                      : formatUsd(o.currentPrice)}
                  </span>
                </p>
                <AdminButton
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditing(structuredClone(o))}
                >
                  Edit
                </AdminButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
        </>
      )}

      <AdminModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Offer"
        footer={
          editing ? (
            <>
              {offers.some((o) => o.id === editing.id) ? (
                <AdminButton
                  variant="danger"
                  onClick={() => {
                    deleteOffer(editing.id);
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
                  upsertOffer({
                    ...editing,
                    discountPct: discountPct(editing.regularPrice, editing.currentPrice),
                  });
                  setEditing(null);
                }}
              >
                Save offer
              </AdminButton>
            </>
          ) : null
        }
      >
        {editing ? (
          <div className="grid gap-3">
            <AdminField label="Product">
              <AdminSelect
                value={editing.productId}
                onChange={(e) => {
                  const p = products.find((x) => x.id === e.target.value);
                  if (!p) return;
                  setEditing({
                    ...editing,
                    productId: p.id,
                    productName: p.name,
                    regularPrice:
                      editing.currency === "INR"
                        ? p.pricing.INR.regularPrice
                        : p.pricing.USD.regularPrice,
                    currentPrice:
                      editing.currency === "INR"
                        ? p.pricing.INR.currentPrice
                        : p.pricing.USD.currentPrice,
                  });
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </AdminSelect>
            </AdminField>
            <AdminField label="Currency">
              <AdminSelect
                value={editing.currency}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    currency: e.target.value as "INR" | "USD",
                  })
                }
              >
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </AdminSelect>
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Regular">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={editing.regularPrice}
                  onChange={(e) =>
                    setEditing({ ...editing, regularPrice: Number(e.target.value) })
                  }
                />
              </AdminField>
              <AdminField label="Current">
                <AdminInput
                  type="number"
                  step="0.01"
                  value={editing.currentPrice}
                  onChange={(e) =>
                    setEditing({ ...editing, currentPrice: Number(e.target.value) })
                  }
                />
              </AdminField>
            </div>
            <AdminField label="Status">
              <AdminSelect
                value={editing.status}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    status: e.target.value as OfferStatus,
                  })
                }
              >
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="expired">Expired</option>
              </AdminSelect>
            </AdminField>
          </div>
        ) : null}
      </AdminModal>
    </div>
  );
}
