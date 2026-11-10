"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, Copy, Download, Lock } from "lucide-react";
import { useAdmin } from "@/admin/store/AdminProvider";
import { resolvePublicPreviewUrl } from "@/admin/lib/resolveAiImageMedia";
import { usePurchases } from "@/context/PurchaseContext";
import { useCatalog } from "@/catalog/useCatalog";
import type { AdminProduct, MediaAsset } from "@/admin/types";
import type { CaptionPackData, PromptData } from "@/catalog/productPayloads";
import {
  productBrowseHref,
  productPdpHref,
  PRODUCT_TYPE_CONFIG,
  type ProductType,
} from "@/catalog/productTypes";
import { CoverImage } from "@/components/ui/CoverImage";
import { userOwnsProductId } from "@/catalog/contentPackMigration";
import { createClient } from "@/lib/supabase/client";
import { fetchLibraryContent } from "@/lib/commerce/clientLibraryContent";

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

  // Ownership for UI gating — content/download APIs still enforce server entitlements.
  const owned = userOwnsProductId(
    productId,
    purchases.map((p) => p.productId),
  );

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
        {type === "PROMPT" && <PromptAccess productId={productId} />}
        {type === "CAPTION_PACK" && <CaptionPackAccess productId={productId} />}
        {type === "AI_IMAGE" && adminProduct && (
          <AiImageAccess
            product={adminProduct}
            products={products}
            mediaAssets={mediaAssets}
          />
        )}
        {type === "VIDEO" && (
          <SecureMasterDownload
            productId={productId}
            label="Download video"
          />
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
        {type !== "PROMPT" &&
          type !== "CAPTION_PACK" &&
          type !== "VIDEO" &&
          type !== "BUNDLE" &&
          type !== "AI_IMAGE" && (
            <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
              This product type does not include library text content.
            </p>
          )}
      </div>
    </div>
  );
}

type TextContentStatus =
  | { phase: "loading" }
  | { phase: "ready"; promptData?: PromptData; captionPackData?: CaptionPackData }
  | { phase: "unauthorized" }
  | { phase: "forbidden" }
  | { phase: "unavailable"; message: string }
  | { phase: "error"; message: string };

function useEntitledTextContent(
  productId: string,
  expectedType: "PROMPT" | "CAPTION_PACK",
) {
  const [status, setStatus] = useState<TextContentStatus>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    setStatus({ phase: "loading" });

    const load = async () => {
      const result = await fetchLibraryContent(productId);
      if (cancelled) return;

      if (!result.ok) {
        if (result.status === 401 || result.code === "AUTH_REQUIRED") {
          setStatus({ phase: "unauthorized" });
          return;
        }
        if (
          result.status === 403 ||
          result.code === "ENTITLEMENT_REQUIRED"
        ) {
          setStatus({ phase: "forbidden" });
          return;
        }
        if (
          result.status === 404 ||
          result.code === "CONTENT_UNAVAILABLE" ||
          result.code === "PRODUCT_NOT_FOUND" ||
          result.code === "UNSUPPORTED_TYPE" ||
          result.code === "BAD_PRODUCT_ID"
        ) {
          setStatus({
            phase: "unavailable",
            message: result.error,
          });
          return;
        }
        setStatus({ phase: "error", message: result.error });
        return;
      }

      if (result.productType !== expectedType) {
        setStatus({
          phase: "unavailable",
          message: "Content type does not match this product",
        });
        return;
      }

      setStatus({
        phase: "ready",
        promptData: result.promptData,
        captionPackData: result.captionPackData,
      });
    };

    void load();

    // Clear private content on logout / account switch — never keep prior payload.
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (cancelled) return;
        if (event === "SIGNED_OUT") {
          setStatus({ phase: "unauthorized" });
          return;
        }
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          setStatus({ phase: "loading" });
          void load();
        }
      });
      subscription = data.subscription;
    } catch {
      /* ignore client init failures — fetch still enforces auth */
    }

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [productId, expectedType]);

  return status;
}

function TextContentGate({ status }: { status: TextContentStatus }) {
  if (status.phase === "loading") {
    return (
      <div className="h-40 animate-pulse rounded-2xl bg-surface-2" aria-busy />
    );
  }
  if (status.phase === "unauthorized") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        <Lock className="mb-2 text-muted" size={20} />
        Sign in to view your purchased content.
        <div className="mt-4">
          <Link
            href="/signin?next=/library"
            className="inline-flex rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }
  if (status.phase === "forbidden") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
        <Lock className="mb-2 text-muted" size={20} />
        This content stays locked until purchase entitlement is verified.
      </div>
    );
  }
  if (status.phase === "unavailable") {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
        {status.message}
      </p>
    );
  }
  if (status.phase === "error") {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
        {status.message}
      </p>
    );
  }
  return null;
}

function PromptAccess({ productId }: { productId: string }) {
  const status = useEntitledTextContent(productId, "PROMPT");
  const gate = <TextContentGate status={status} />;
  if (status.phase !== "ready" || !status.promptData) {
    return gate;
  }
  const data = status.promptData;
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

function CaptionPackAccess({ productId }: { productId: string }) {
  const status = useEntitledTextContent(productId, "CAPTION_PACK");
  const gate = <TextContentGate status={status} />;
  if (status.phase !== "ready" || !status.captionPackData) {
    return gate;
  }
  const data = status.captionPackData;
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

function SecureMasterDownload({
  productId,
  label,
}: {
  productId: string;
  label: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <p className="text-sm text-muted">
        Downloads require a signed-in account with a paid entitlement. Master
        files are never exposed directly to the browser.
      </p>
      <button
        type="button"
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        onClick={async () => {
          if (busy) return;
          setMessage(null);
          setBusy(true);
          try {
            const { requestAndStartMasterDownload } = await import(
              "@/lib/commerce/clientMasterDownload"
            );
            const result = await requestAndStartMasterDownload(productId);
            if (!result.ok) {
              setMessage(result.error);
            }
          } catch {
            setMessage("Download request failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} />
        {busy ? "Preparing…" : label}
      </button>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </div>
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
  const previewItems = (() => {
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

    return memberProducts.map((p) => {
      const asset = p.mediaAssetId
        ? mediaAssets.find((a) => a.id === p.mediaAssetId)
        : undefined;
      // Watermarked public preview only — never master
      const previewUrl = asset ? resolvePublicPreviewUrl(asset) : "";
      return {
        id: p.id,
        previewUrl,
        label: asset?.originalFileName || p.name || p.id,
      };
    });
  })();

  return (
    <div className="space-y-6">
      <SecureMasterDownload productId={product.id} label="Download master" />
      {previewItems.some((i) => i.previewUrl) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {previewItems.map((image) =>
            image.previewUrl ? (
              <figure
                key={image.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface"
              >
                <div className="relative aspect-square">
                  <CoverImage
                    src={image.previewUrl}
                    alt={image.label}
                    fill
                    sizes="320px"
                  />
                </div>
                <figcaption className="p-3 text-xs text-muted">
                  Preview only — use Download master for the original file.
                </figcaption>
              </figure>
            ) : null,
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
          Preview thumbnail is not available yet. Master download still uses the
          secure entitlement API when media is ready.
        </p>
      )}
    </div>
  );
}
