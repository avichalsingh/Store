/**
 * Entitlement-gated short-lived signed master download URLs.
 * Never returns master_path to callers of the HTTP layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_MASTERS_BUCKET } from "@/lib/supabase/mediaStorage";

const SIGNED_URL_TTL_SECONDS = 120;

/**
 * Filesystem-safe attachment name ending in `.mp4` (product title preferred).
 */
export function sanitizeDownloadFileName(raw: string): string {
  const base =
    raw
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[.-]+|[.-]+$/g, "")
      .slice(0, 80) || "download";
  const withoutMp4 = base.replace(/\.mp4$/i, "");
  return `${withoutMp4 || "download"}.mp4`;
}

export type SignedDownload =
  | {
      ok: true;
      signedUrl: string;
      expiresIn: number;
      fileName: string;
    }
  | { ok: false; status: number; error: string; code: string };

export async function userHasEntitlement(
  admin: SupabaseClient,
  userId: string,
  productId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return !error && Boolean(data?.id);
}

export async function createEntitledMasterDownload(
  admin: SupabaseClient,
  params: { userId: string; productId: string },
): Promise<SignedDownload> {
  const entitled = await userHasEntitlement(
    admin,
    params.userId,
    params.productId,
  );
  if (!entitled) {
    return {
      ok: false,
      status: 403,
      error: "Purchase entitlement required",
      code: "ENTITLEMENT_REQUIRED",
    };
  }

  const { data: product, error: productErr } = await admin
    .from("products")
    .select("id, media_asset_id, name")
    .eq("id", params.productId)
    .maybeSingle();

  if (productErr || !product?.media_asset_id) {
    return {
      ok: false,
      status: 404,
      error: "No downloadable media for this product",
      code: "MEDIA_NOT_FOUND",
    };
  }

  const { data: asset, error: assetErr } = await admin
    .from("media_assets")
    .select("id, master_bucket, master_path, original_file_name, name")
    .eq("id", product.media_asset_id)
    .maybeSingle();

  if (assetErr || !asset?.master_path?.trim()) {
    return {
      ok: false,
      status: 404,
      error: "Master file is not available",
      code: "MASTER_NOT_FOUND",
    };
  }

  const bucket =
    (asset.master_bucket?.trim() || MEDIA_MASTERS_BUCKET).trim() ||
    MEDIA_MASTERS_BUCKET;
  const path = asset.master_path.trim();

  if (bucket !== MEDIA_MASTERS_BUCKET) {
    return {
      ok: false,
      status: 400,
      error: "Invalid master storage location",
      code: "INVALID_MASTER",
    };
  }

  if (path.includes("..") || path.startsWith("/")) {
    return {
      ok: false,
      status: 400,
      error: "Invalid master path",
      code: "INVALID_MASTER",
    };
  }

  const fileName = sanitizeDownloadFileName(
    product.name?.trim() ||
      asset.original_file_name?.trim() ||
      asset.name?.trim() ||
      path.split("/").pop() ||
      "download",
  );

  // `download: fileName` makes Storage serve Content-Disposition: attachment
  // so browsers download instead of inline-playing the MP4.
  const { data: signed, error: signErr } = await admin.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: fileName });

  if (signErr || !signed?.signedUrl) {
    return {
      ok: false,
      status: 500,
      error: "Could not create download link",
      code: "SIGN_FAILED",
    };
  }

  return {
    ok: true,
    signedUrl: signed.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
    fileName,
  };
}
