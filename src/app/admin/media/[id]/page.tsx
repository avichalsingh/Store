"use client";

import { MediaPreviewPlayer } from "@/admin/components/media/MediaPreviewPlayer";
import { MediaProductUsage } from "@/admin/components/media/MediaProductUsage";
import { ProcessingStepsList } from "@/admin/components/media/ProcessingStepsList";
import { ThumbnailFramePicker } from "@/admin/components/media/ThumbnailFramePicker";
import { AdminBadge } from "@/admin/components/ui/AdminBadge";
import { AdminButton } from "@/admin/components/ui/AdminButton";
import { AdminCard } from "@/admin/components/ui/AdminCard";
import { AdminPageHeader } from "@/admin/components/ui/AdminPageHeader";
import { AdminThumb } from "@/admin/components/ui/AdminThumb";
import { resolveMediaAssetDisplayUrl } from "@/admin/lib/resolveAiImageMedia";
import { restoreObjectUrl } from "@/admin/services/mediaBlobStore";
import { persistFrameThumbnail } from "@/admin/services/mediaDerivatives";
import { useAdmin } from "@/admin/store/AdminProvider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function MediaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id ?? "");
  const {
    mediaAssets,
    products,
    mediaSettings,
    updateMediaAsset,
    detachMediaFromProduct,
    detachImageAssetFromAiProduct,
    pushToast,
    hydrated,
  } = useAdmin();
  const [scrub, setScrub] = useState(0);
  const [frameBusy, setFrameBusy] = useState(false);
  const [masterFrameSrc, setMasterFrameSrc] = useState("");

  const asset = useMemo(
    () => mediaAssets.find((a) => a.id === id),
    [mediaAssets, id],
  );

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!asset) {
        setMasterFrameSrc("");
        return;
      }
      if (asset.master.url?.startsWith("blob:")) {
        setMasterFrameSrc(asset.master.url);
        return;
      }
      if (asset.hasLocalBlob) {
        const url = await restoreObjectUrl(asset.id, "original");
        if (!cancelled) setMasterFrameSrc(url || "");
        return;
      }
      if (asset.type === "image") {
        if (!cancelled) {
          setMasterFrameSrc(
            asset.thumbnail.url || asset.master.url || asset.preview.url || "",
          );
        }
        return;
      }
      if (!cancelled) setMasterFrameSrc("");
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [asset]);

  const linkedProducts = useMemo(() => {
    if (!asset) return [];
    return products.filter((p) => asset.usedByProductIds.includes(p.id));
  }, [asset, products]);

  if (!hydrated) return null;

  if (!asset) {
    return (
      <div>
        <AdminPageHeader title="Media not found" />
        <Link href="/admin/media" className="text-sm text-[var(--admin-accent)] hover:underline">
          Back to Media Library
        </Link>
      </div>
    );
  }

  const setFrame = async (seconds: number) => {
    setFrameBusy(true);
    try {
      let src = masterFrameSrc;
      if (!src) {
        src = (await restoreObjectUrl(asset.id, "original")) || "";
      }
      if (!src) {
        pushToast(
          "Master video required to capture a clean thumbnail frame",
          "error",
        );
        return;
      }
      const saved = await persistFrameThumbnail(asset.id, src, seconds);
      updateMediaAsset(
        asset.id,
        {
          thumbnail: {
            url: saved.url,
            source: "frame",
            timestamp: saved.timestamp,
            timestampLabel: saved.timestampLabel,
          },
          processingSteps: {
            ...asset.processingSteps,
            thumbnailReady: true,
          },
        },
        "Clean thumbnail frame saved",
      );
    } catch {
      pushToast("Could not capture frame", "error");
    } finally {
      setFrameBusy(false);
    }
  };

  if (asset.type === "image") {
    const previewUrl =
      (asset.previewPlayback === "generated" || asset.preview.watermarkApplied) &&
      asset.preview.url
        ? asset.preview.url
        : resolveMediaAssetDisplayUrl(asset);
    const masterUrl =
      masterFrameSrc || asset.master.url || asset.thumbnail.url || "";

    return (
      <div>
        <AdminPageHeader
          title={asset.name}
          description="One image asset — Master (original) and Preview (generated, watermarked)."
          actions={
            <Link href="/admin/media">
              <AdminButton variant="secondary">Back to library</AdminButton>
            </Link>
          }
        />
        <div className="grid gap-5 lg:grid-cols-2">
          <AdminCard padding={false} className="overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Master · original · no watermark
              </p>
            </div>
            <div className="relative aspect-square bg-[var(--admin-surface-2)]">
              <AdminThumb
                src={masterUrl}
                alt=""
                sizes="340px"
                rounded="rounded-none"
              />
            </div>
            <div className="space-y-2 p-3 text-sm">
              <p className="text-xs text-[var(--admin-muted)]">
                {[asset.master.fileName, asset.master.resolution, asset.master.sizeLabel]
                  .filter(Boolean)
                  .join(" · ") || "Protected original"}
              </p>
            </div>
          </AdminCard>
          <AdminCard padding={false} className="overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                  Preview · optimized · watermarked
                </p>
                <AdminBadge
                  tone={
                    asset.processingStatus === "ready"
                      ? "success"
                      : asset.processingStatus === "failed"
                        ? "danger"
                        : "info"
                  }
                >
                  {asset.processingStatus.toUpperCase()}
                </AdminBadge>
              </div>
            </div>
            <div className="relative aspect-square bg-[var(--admin-surface-2)]">
              {previewUrl && asset.processingStatus === "ready" ? (
                <AdminThumb
                  src={previewUrl}
                  alt=""
                  sizes="340px"
                  rounded="rounded-none"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--admin-muted)]">
                  {asset.processingStatus === "failed"
                    ? asset.processingError || "Preview failed"
                    : "Preview generating…"}
                </div>
              )}
            </div>
            <div className="space-y-2 p-3 text-sm">
              <p className="text-xs text-[var(--admin-muted)]">
                {[
                  asset.preview.resolution,
                  asset.preview.sizeLabel,
                  asset.preview.watermarkApplied ? "Watermark applied" : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Used for catalog & storefront"}
              </p>
            </div>
          </AdminCard>
        </div>
        <AdminCard className="mt-5">
          <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
            Usage
          </h2>
          <MediaProductUsage
            products={linkedProducts}
            mediaAssets={mediaAssets}
            onAttach={() => router.push(`/admin/media?attach=${asset.id}`)}
            onChange={() => router.push(`/admin/media?attach=${asset.id}`)}
            onManage={() => router.push(`/admin/media?attach=${asset.id}`)}
            onDetach={(productId) =>
              detachImageAssetFromAiProduct(productId, asset.id)
            }
          />
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={asset.name}
        description="Master file, generated assets, usage, and thumbnail controls."
        actions={
          <Link href="/admin/media">
            <AdminButton variant="secondary">Back to library</AdminButton>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,340px)_1fr]">
        <div className="space-y-4">
          <AdminCard padding={false} className="overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Master / original
              </p>
              <p className="text-[10px] text-[var(--admin-muted)]">
                Full quality · never watermarked · never overwritten
              </p>
            </div>
            <div className="relative aspect-[9/16] bg-black">
              <MediaPreviewPlayer
                asset={asset}
                variant="detail"
                preferSource="master"
              />
            </div>
          </AdminCard>

          <AdminCard padding={false} className="overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Customer preview
              </p>
              <p className="text-[10px] text-[var(--admin-muted)]">
                Separate derivative · optimized · watermark baked
              </p>
            </div>
            <div className="relative aspect-[9/16] bg-black">
              <MediaPreviewPlayer
                asset={asset}
                variant="detail"
                preferSource="preview"
              />
            </div>
          </AdminCard>
        </div>

        <div className="space-y-4">
          <AdminCard className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Master file
              </h2>
              <AdminBadge
                tone={
                  asset.processingStatus === "ready"
                    ? "success"
                    : asset.processingStatus === "failed"
                      ? "danger"
                      : "info"
                }
              >
                {asset.processingStatus.toUpperCase()}
              </AdminBadge>
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-[var(--admin-muted)]">File name</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.fileName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--admin-muted)]">Size</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.sizeLabel}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--admin-muted)]">Resolution</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.resolution}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[var(--admin-muted)]">Duration</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  {asset.master.duration}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-[var(--admin-muted)]">Access</dt>
                <dd className="font-medium text-[var(--admin-text)]">
                  Protected · download not public
                </dd>
              </div>
            </dl>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Generated assets
            </h2>
            <ProcessingStepsList
              steps={asset.processingSteps}
              status={asset.processingStatus}
            />
            <div className="mt-4 grid gap-2 text-xs text-[var(--admin-muted)] sm:grid-cols-2">
              <p>
                Preview: {asset.preview.resolution} · {asset.preview.quality} ·{" "}
                {asset.preview.access}
              </p>
              <p>
                Watermark:{" "}
                {asset.watermarkMode === "global"
                  ? `Global (${mediaSettings.watermark.style}, ${mediaSettings.watermark.opacity}%)`
                  : "Custom overrides"}
              </p>
              <p>Thumbnail: Frame at {asset.thumbnail.timestampLabel}</p>
              <p>Download: Protected · not exposed publicly</p>
            </div>
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Usage
            </h2>
            <MediaProductUsage
              products={linkedProducts}
              mediaAssets={mediaAssets}
              onAttach={() => router.push(`/admin/media?attach=${asset.id}`)}
              onChange={() => router.push(`/admin/media?attach=${asset.id}`)}
              onManage={() => router.push(`/admin/media?attach=${asset.id}`)}
              onDetach={(productId) => detachMediaFromProduct(productId)}
            />
          </AdminCard>

          <AdminCard>
            <h2 className="mb-3 font-[family-name:var(--font-syne)] text-sm font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
              Change thumbnail
            </h2>
            <p className="mb-3 text-xs text-[var(--admin-muted)]">
              Clean frames from the master video only (no watermark). Current:{" "}
              {asset.thumbnail.timestampLabel} · {asset.thumbnail.source}
            </p>
            <ThumbnailFramePicker
              durationSeconds={asset.master.durationSeconds}
              value={scrub || asset.thumbnail.timestamp}
              videoSrc={masterFrameSrc || undefined}
              savedThumbUrl={asset.thumbnail.url || undefined}
              onChange={setScrub}
              onSetFrame={setFrame}
              busy={frameBusy}
              onAutoPick={async () => {
                const seconds = Math.min(
                  asset.master.durationSeconds * 0.35,
                  Math.max(0.5, asset.master.durationSeconds - 0.5),
                );
                setScrub(seconds);
                await setFrame(seconds);
              }}
            />
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
