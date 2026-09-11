"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Download, Lock } from "lucide-react";
import { useAdmin } from "@/admin/store/AdminProvider";
import { resolveMediaAssetDisplayUrl } from "@/admin/lib/resolveAiImageMedia";
import { usePurchases } from "@/context/PurchaseContext";
import { useCatalog } from "@/catalog/useCatalog";
import type { AdminProduct, MediaAsset } from "@/admin/types";
import {
  productBrowseHref,
  productPdpHref,
  PRODUCT_TYPE_CONFIG,
  type ProductType,
} from "@/catalog/productTypes";
import { CoverImage } from "@/components/ui/CoverImage";
import { userOwnsProductId } from "@/catalog/contentPackMigration";
import { mockPurchases } from "@/data/purchases";

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text transition hover:border-accent/40 hover:text-accent"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function LibraryProductPage() {
  const params = useParams<{ productId: string }>();
  const productId = params.productId;
  const { purchases, hydrated: purchasesHydrated } = usePurchases();
  const { products, mediaAssets, hydrated: adminHydrated } = useAdmin();
  const catalog = useCatalog();

  const owned =
    userOwnsProductId(
      productId,
      [
        ...purchases.map((p) => p.productId),
        ...mockPurchases.map((p) => p.productId),
      ],
    ) ||
    mockPurchases.some((p) => p.productId === productId);

  const adminProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const publicProduct = catalog.getProductById(productId);
  const purchaseMeta = purchases.find((p) => p.productId === productId);

  if (!purchasesHydrated || !adminHydrated || !catalog.hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!owned) {
    const slug = publicProduct?.slug ?? adminProduct?.slug;
    const type = (publicProduct?.productType ??
      adminProduct?.productType ??
      "VIDEO") as ProductType;
    const buyHref = slug
      ? productPdpHref(type, slug)
      : productBrowseHref(type);
    return (
      <div className="mx-auto max-w-lg px-4 pb-20 pt-28 text-center sm:px-6">
        <Lock className="mx-auto text-muted" size={32} />
        <h1 className="mt-4 font-display text-3xl font-bold">Locked content</h1>
        <p className="mt-2 text-muted">
          Purchase this product to unlock full access in your library.
        </p>
        <Link
          href={buyHref}
          className="mt-8 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          View product
        </Link>
      </div>
    );
  }

  const title =
    adminProduct?.name ??
    publicProduct?.title ??
    purchaseMeta?.title ??
    "Product";
  const type = (adminProduct?.productType ??
    publicProduct?.productType ??
    "VIDEO") as ProductType;
  const typeLabel = PRODUCT_TYPE_CONFIG[type]?.singular ?? type;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
        Library · {typeLabel}
      </p>
      <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">
        Full purchased content — keep this private.
      </p>

      <div className="mt-10 space-y-8">
        {type === "PROMPT" && adminProduct?.promptData && (
          <PromptAccess data={adminProduct.promptData} />
        )}
        {type === "CAPTION_PACK" && adminProduct?.captionPackData && (
          <CaptionPackAccess data={adminProduct.captionPackData} />
        )}
        {type === "AI_IMAGE" && adminProduct && (
          <AiImageAccess
            product={adminProduct}
            products={products}
            mediaAssets={mediaAssets}
          />
        )}
        {type === "VIDEO" && (
          <div className="rounded-3xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Your video download is ready. In production this would stream or
              deliver the master file.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white"
            >
              <Download size={16} />
              Download video
            </button>
          </div>
        )}
        {type === "BUNDLE" && publicProduct?.productType === "BUNDLE" && (
          <ul className="space-y-3">
            {publicProduct.includedSummaries.map((inc) => (
              <li key={inc.id}>
                <Link
                  href={`/library/${inc.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3 transition hover:border-accent/40"
                >
                  <div className="relative h-14 w-10 overflow-hidden rounded-lg">
                    <CoverImage
                      src={inc.thumbnail}
                      alt=""
                      fill
                      sizes="40px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{inc.title}</p>
                    <p className="text-xs text-muted">
                      {inc.productType.replace(/_/g, " ")}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-accent">Open</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!adminProduct && type !== "VIDEO" && type !== "BUNDLE" && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
            Content payload is not available in CMS for this product yet.
          </p>
        )}
      </div>
    </div>
  );
}

function PromptAccess({
  data,
}: {
  data: NonNullable<
    import("@/admin/types").AdminProduct["promptData"]
  >;
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-border bg-surface p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">Main prompt</h2>
          <CopyButton text={data.mainPrompt} />
        </div>
        <pre className="whitespace-pre-wrap break-words rounded-2xl bg-surface-2 p-4 text-sm text-text">
          {data.mainPrompt || "—"}
        </pre>
      </section>
      {data.negativePrompt ? (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Negative prompt</h2>
            <CopyButton text={data.negativePrompt} />
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-2xl bg-surface-2 p-4 text-sm text-text">
            {data.negativePrompt}
          </pre>
        </section>
      ) : null}
      {data.generationSettings ? (
        <section className="rounded-3xl border border-border bg-surface p-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Settings</h2>
            <CopyButton text={data.generationSettings} />
          </div>
          <pre className="whitespace-pre-wrap break-words rounded-2xl bg-surface-2 p-4 text-sm text-text">
            {data.generationSettings}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function CaptionPackAccess({
  data,
}: {
  data: { items: { id: string; caption: string; hashtags: string[]; label?: string }[] };
}) {
  return (
    <ul className="space-y-4">
      {data.items.map((item, index) => {
        const joined = item.hashtags.filter(Boolean).join(" ");
        const copyText = [item.caption, joined].filter(Boolean).join("\n\n");
        return (
          <li
            key={item.id}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {item.label || `Item ${index + 1}`}
              </p>
              <CopyButton text={copyText} label="Copy item" />
            </div>
            <p className="text-sm leading-relaxed text-text">{item.caption}</p>
            {joined ? (
              <p className="mt-3 text-sm text-text-dim">{joined}</p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function AiImageAccess({
  product,
  products,
  mediaAssets,
}: {
  product: AdminProduct;
  products: AdminProduct[];
  mediaAssets: MediaAsset[];
}) {
  const downloadItems = (() => {
    const colId = product.aiImageData?.collectionId;
    const isPack = Boolean(product.aiImageData?.isCollectionPack);

    const memberProducts =
      isPack && colId
        ? products.filter(
            (p) =>
              p.productType === "AI_IMAGE" &&
              !p.aiImageData?.isCollectionPack &&
              p.aiImageData?.collectionId === colId,
          )
        : [product];

    return memberProducts
      .map((p) => {
        const asset = p.mediaAssetId
          ? mediaAssets.find((a) => a.id === p.mediaAssetId)
          : undefined;
        const url = asset
          ? resolveMediaAssetDisplayUrl(asset) || asset.master.url || ""
          : "";
        if (!url) return null;
        return {
          id: p.id,
          url,
          fileName:
            asset?.originalFileName ||
            asset?.master.fileName ||
            `${p.slug || p.id}.jpg`,
        };
      })
      .filter(Boolean) as Array<{ id: string; url: string; fileName: string }>;
  })();

  if (!downloadItems.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
        Master image is not available for download yet. Re-open this page after
        the media library finishes loading, or contact support if this persists.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {downloadItems.map((image) => (
        <figure
          key={image.id}
          className="overflow-hidden rounded-2xl border border-border bg-surface"
        >
          <div className="relative aspect-square">
            <CoverImage
              src={image.url}
              alt={image.fileName}
              fill
              sizes="320px"
            />
          </div>
          <figcaption className="flex items-center justify-between gap-2 p-3">
            <span className="truncate text-xs text-muted">{image.fileName}</span>
            <a
              href={image.url}
              download={image.fileName}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
            >
              <Download size={12} />
              Download
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
