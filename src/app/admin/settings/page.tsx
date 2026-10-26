"use client";

import { WatermarkPreview } from "@/admin/components/media/WatermarkPreview";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import {
  AdminField,
  AdminInput,
  AdminSelect,
  AdminToggle,
} from "@/admin/components/ui/AdminField";
import { AdminConfirmDialog } from "@/admin/components/ui/AdminModal";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminTabs } from "@/admin/components/ui/AdminTabs";
import { listEligibleVideoAssetsForWatermarkRefresh } from "@/admin/lib/watermarkPreviewRefresh";
import { signOutAdmin } from "@/admin/lib/signOutAdmin";
import { useAdmin } from "@/admin/store/AdminProvider";
import type {
  GlobalMediaSettings,
  PreviewQuality,
  WatermarkMovement,
  WatermarkSize,
  WatermarkStyle,
} from "@/admin/types";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Tab = "general" | "admin" | "payments" | "storage" | "media" | "site";

export default function SettingsPage() {
  const router = useRouter();
  const {
    pushToast,
    resetStore,
    hydrated,
    mediaSettings,
    mediaAssets,
    setMediaSettings,
    refreshEligibleWatermarkPreviews,
    watermarkRefreshProgress,
  } = useAdmin();
  const [tab, setTab] = useState<Tab>("general");
  const [storeName, setStoreName] = useState("RHYTHM");
  const [supportEmail, setSupportEmail] = useState("hello@rhythm.studio");
  const [defaultMarket, setDefaultMarket] = useState("INR");
  const [twoFactor, setTwoFactor] = useState(false);
  const [razorpay, setRazorpay] = useState(true);
  const [stripe, setStripe] = useState(true);
  const [cdn, setCdn] = useState("Cloudflare R2");
  const [maintenance, setMaintenance] = useState(false);
  const [mediaDraft, setMediaDraft] = useState<GlobalMediaSettings | null>(null);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [refreshConfirm, setRefreshConfirm] = useState<{
    open: boolean;
    count: number;
    wmChanged: boolean;
    qualityChanged: boolean;
  }>({ open: false, count: 0, wmChanged: false, qualityChanged: false });

  useEffect(() => {
    if (hydrated) setMediaDraft(structuredClone(mediaSettings));
  }, [hydrated, mediaSettings]);

  const saveMediaSettings = async () => {
    if (!mediaDraft) return;
    setMediaSaving(true);
    try {
      const next = structuredClone(mediaDraft);
      const wm = next.watermark;

      if (wm.imageUrl?.startsWith("blob:")) {
        const blobRes = await fetch(wm.imageUrl);
        if (!blobRes.ok) {
          pushToast("Could not read watermark logo file", "error");
          return;
        }
        const blob = await blobRes.blob();
        const fd = new FormData();
        fd.append("file", blob, wm.imageName || "watermark.png");
        const res = await fetch("/api/admin/media/watermark-logo", {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          path?: string;
          displayUrl?: string;
          imageName?: string;
        } | null;
        if (!res.ok || !data?.ok || !data.path || !data.displayUrl) {
          pushToast(
            data?.error || "Failed to upload watermark logo",
            "error",
          );
          return;
        }
        next.watermark = {
          ...wm,
          imageStoragePath: data.path,
          imageUrl: data.displayUrl,
          imageName: data.imageName || wm.imageName,
        };
      } else if (!wm.imageUrl && !wm.imageStoragePath) {
        if (mediaSettings.watermark.imageStoragePath) {
          await fetch("/api/admin/media/watermark-logo", {
            method: "DELETE",
            credentials: "same-origin",
          }).catch(() => undefined);
        }
        next.watermark = {
          ...wm,
          imageUrl: undefined,
          imageName: undefined,
          imageStoragePath: undefined,
        };
      }

      const wmChanged =
        JSON.stringify(mediaSettings.watermark) !==
        JSON.stringify(next.watermark);
      const qualityChanged =
        mediaSettings.defaultPreviewQuality !== next.defaultPreviewQuality;

      setMediaSettings(next);

      // Settings save never auto-starts bulk regen — ask first when eligible.
      if (wmChanged || qualityChanged) {
        const eligible = listEligibleVideoAssetsForWatermarkRefresh(
          mediaAssets,
          { wmChanged, qualityChanged },
        );
        if (eligible.length > 0) {
          setRefreshConfirm({
            open: true,
            count: eligible.length,
            wmChanged,
            qualityChanged,
          });
        }
      }
    } finally {
      setMediaSaving(false);
    }
  };

  if (!hydrated || !mediaDraft) return null;

  return (
    <div>
      <AdminPageHeader
        title={tab === "media" ? "Media & Watermark" : "Settings"}
        description={
          tab === "media"
            ? "Configure how RHYTHM generates and protects preview videos."
            : "Workspace preferences for the admin CMS (mock)."
        }
      />

      <div className="mb-5">
        <AdminTabs
          tabs={[
            { id: "general", label: "General" },
            { id: "admin", label: "Admin" },
            { id: "payments", label: "Payments" },
            { id: "storage", label: "Storage" },
            { id: "media", label: "Media & Watermark" },
            { id: "site", label: "Site" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "general" ? (
        <AdminCard className="max-w-xl space-y-4">
          <AdminField label="Store name">
            <AdminInput value={storeName} onChange={(e) => setStoreName(e.target.value)} />
          </AdminField>
          <AdminField label="Support email">
            <AdminInput
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </AdminField>
          <AdminField label="Default market">
            <AdminSelect
              value={defaultMarket}
              onChange={(e) => setDefaultMarket(e.target.value)}
            >
              <option value="INR">India (INR)</option>
              <option value="USD">Global (USD)</option>
            </AdminSelect>
          </AdminField>
          <AdminButton
            variant="primary"
            onClick={() => pushToast("General settings saved")}
          >
            Save general
          </AdminButton>
        </AdminCard>
      ) : null}

      {tab === "admin" ? (
        <AdminCard className="max-w-xl space-y-4">
          <AdminToggle
            checked={twoFactor}
            onChange={setTwoFactor}
            label="Require 2FA for admin accounts (demo)"
          />
          <AdminButton
            variant="secondary"
            onClick={() => {
              void signOutAdmin().then(() => {
                router.replace("/admin/login");
              });
            }}
          >
            Sign out
          </AdminButton>
          <AdminButton
            variant="danger"
            onClick={() => {
              if (confirm("Reset all admin mock data to seed?")) resetStore();
            }}
          >
            Reset CMS data
          </AdminButton>
        </AdminCard>
      ) : null}

      {tab === "payments" ? (
        <AdminCard className="max-w-xl space-y-4">
          <AdminToggle
            checked={razorpay}
            onChange={setRazorpay}
            label="Razorpay (INR)"
          />
          <AdminToggle checked={stripe} onChange={setStripe} label="Stripe (USD)" />
          <p className="text-xs text-[var(--admin-muted)]">
            Payment providers are mocked in this CMS. No live keys are stored.
          </p>
          <AdminButton
            variant="primary"
            onClick={() => pushToast("Payment settings saved")}
          >
            Save payments
          </AdminButton>
        </AdminCard>
      ) : null}

      {tab === "storage" ? (
        <AdminCard className="max-w-xl space-y-4">
          <AdminField label="Media storage">
            <AdminSelect value={cdn} onChange={(e) => setCdn(e.target.value)}>
              <option>Cloudflare R2</option>
              <option>AWS S3</option>
              <option>Local /public</option>
            </AdminSelect>
          </AdminField>
          <AdminButton
            variant="primary"
            onClick={() => pushToast("Storage settings saved")}
          >
            Save storage
          </AdminButton>
        </AdminCard>
      ) : null}

      {tab === "media" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_minmax(0,280px)]">
          <AdminCard className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Global preview watermark
                </h2>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  Watermarks help discourage unauthorized reuse of preview videos.
                </p>
              </div>
              <AdminToggle
                checked={mediaDraft.watermark.enabled}
                onChange={(enabled) =>
                  setMediaDraft({
                    ...mediaDraft,
                    watermark: { ...mediaDraft.watermark, enabled },
                  })
                }
                label={mediaDraft.watermark.enabled ? "On" : "Off"}
              />
            </div>

            <AdminField
              label="Upload watermark"
              hint="PNG or WebP with transparent background preferred"
            >
              <AdminInput
                type="file"
                accept="image/png,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  setMediaDraft({
                    ...mediaDraft,
                    watermark: {
                      ...mediaDraft.watermark,
                      imageUrl: url,
                      imageName: file.name,
                      imageStoragePath: undefined,
                    },
                  });
                }}
              />
              {mediaDraft.watermark.imageUrl ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-[var(--admin-border)] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaDraft.watermark.imageUrl}
                    alt=""
                    className="h-10 w-10 rounded-lg object-contain bg-[var(--admin-surface-2)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {mediaDraft.watermark.imageName || "Watermark"}
                    </p>
                    <div className="mt-1 flex gap-2">
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/png,image/webp";
                          input.onchange = () => {
                            const file = input.files?.[0];
                            if (!file) return;
                            const url = URL.createObjectURL(file);
                            setMediaDraft({
                              ...mediaDraft,
                              watermark: {
                                ...mediaDraft.watermark,
                                imageUrl: url,
                                imageName: file.name,
                                imageStoragePath: undefined,
                              },
                            });
                          };
                          input.click();
                        }}
                      >
                        Replace
                      </AdminButton>
                      <AdminButton
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setMediaDraft({
                            ...mediaDraft,
                            watermark: {
                              ...mediaDraft.watermark,
                              imageUrl: undefined,
                              imageName: undefined,
                              imageStoragePath: undefined,
                            },
                          })
                        }
                      >
                        Remove
                      </AdminButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </AdminField>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Watermark style">
                <AdminSelect
                  value={mediaDraft.watermark.style}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      watermark: {
                        ...mediaDraft.watermark,
                        style: e.target.value as WatermarkStyle,
                      },
                    })
                  }
                >
                  <option value="diagonal">Diagonal Repeating</option>
                  <option value="center">Large Center</option>
                  <option value="corner">Corner</option>
                  <option value="custom">Custom</option>
                </AdminSelect>
              </AdminField>
              <AdminField label={`Opacity · ${mediaDraft.watermark.opacity}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={mediaDraft.watermark.opacity}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      watermark: {
                        ...mediaDraft.watermark,
                        opacity: Number(e.target.value),
                      },
                    })
                  }
                  className="mt-2 w-full accent-[var(--admin-accent)]"
                />
              </AdminField>
              <AdminField label="Size">
                <AdminSelect
                  value={mediaDraft.watermark.size}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      watermark: {
                        ...mediaDraft.watermark,
                        size: e.target.value as WatermarkSize,
                      },
                    })
                  }
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Movement">
                <AdminSelect
                  value={mediaDraft.watermark.movement}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      watermark: {
                        ...mediaDraft.watermark,
                        movement: e.target.value as WatermarkMovement,
                      },
                    })
                  }
                >
                  <option value="static">Static</option>
                  <option value="subtle">Subtle Movement</option>
                  <option value="dynamic">Dynamic</option>
                  <option value="continuous-diagonal">
                    Continuous Diagonal Movement
                  </option>
                </AdminSelect>
              </AdminField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Default preview quality">
                <AdminSelect
                  value={mediaDraft.defaultPreviewQuality}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      defaultPreviewQuality: e.target.value as PreviewQuality,
                    })
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="optimized">Optimized</option>
                  <option value="high">High</option>
                </AdminSelect>
              </AdminField>
              <AdminField label="Preview resolution">
                <AdminInput
                  value={mediaDraft.previewResolution}
                  onChange={(e) =>
                    setMediaDraft({
                      ...mediaDraft,
                      previewResolution: e.target.value,
                    })
                  }
                />
              </AdminField>
            </div>

            <AdminButton
              variant="primary"
              disabled={mediaSaving}
              onClick={() => void saveMediaSettings()}
            >
              {mediaSaving ? "Saving…" : "Save media settings"}
            </AdminButton>

            {watermarkRefreshProgress && !watermarkRefreshProgress.done ? (
              <p
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs text-[var(--admin-muted)]"
                role="status"
                aria-live="polite"
              >
                Preview refresh: {watermarkRefreshProgress.succeeded} succeeded
                {watermarkRefreshProgress.failed > 0
                  ? `, ${watermarkRefreshProgress.failed} failed`
                  : ""}
                , {watermarkRefreshProgress.running} running,{" "}
                {watermarkRefreshProgress.pending} queued (
                {watermarkRefreshProgress.succeeded +
                  watermarkRefreshProgress.failed +
                  watermarkRefreshProgress.running +
                  watermarkRefreshProgress.pending}
                /{watermarkRefreshProgress.total})
              </p>
            ) : null}
            {watermarkRefreshProgress?.done ? (
              <p
                className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-2)] px-3 py-2 text-xs text-[var(--admin-muted)]"
                role="status"
              >
                Last refresh: {watermarkRefreshProgress.succeeded} updated
                {watermarkRefreshProgress.failed > 0
                  ? `, ${watermarkRefreshProgress.failed} failed (previous previews kept)`
                  : ""}
              </p>
            ) : null}
          </AdminCard>

          <AdminCard>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Live preview
            </p>
            <WatermarkPreview config={mediaDraft.watermark} className="mx-auto w-full" />
          </AdminCard>
        </div>
      ) : null}

      {tab === "site" ? (
        <AdminCard className="max-w-xl space-y-4">
          <AdminToggle
            checked={maintenance}
            onChange={setMaintenance}
            label="Maintenance mode (demo flag)"
          />
          <AdminButton
            variant="primary"
            onClick={() => pushToast("Site settings saved")}
          >
            Save site
          </AdminButton>
        </AdminCard>
      ) : null}

      <AdminConfirmDialog
        open={refreshConfirm.open}
        onClose={() =>
          setRefreshConfirm((prev) => ({ ...prev, open: false }))
        }
        onConfirm={() => {
          refreshEligibleWatermarkPreviews({
            wmChanged: refreshConfirm.wmChanged,
            qualityChanged: refreshConfirm.qualityChanged,
          });
        }}
        title="Regenerate video previews?"
        description={
          refreshConfirm.count === 1
            ? "1 eligible video preview will be regenerated with the saved watermark/quality settings (max 2 jobs at a time). Cancel to keep existing previews until you regenerate manually."
            : `${refreshConfirm.count} eligible video previews will be regenerated with the saved watermark/quality settings (max 2 jobs at a time). Cancel to keep existing previews until you regenerate manually.`
        }
        confirmLabel={
          refreshConfirm.count === 1
            ? "Regenerate 1 preview"
            : `Regenerate ${refreshConfirm.count} previews`
        }
      />
    </div>
  );
}
