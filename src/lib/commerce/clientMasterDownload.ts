/**
 * Browser helper: request an entitlement-gated signed URL and start a download
 * without opening a new tab or navigating the current page.
 */

export type MasterDownloadResult =
  | { ok: true; fileName: string }
  | { ok: false; error: string };

/**
 * Triggers attachment download via a same-document temporary anchor.
 * Relies on the API returning a Supabase signed URL with `download=` so the
 * response uses Content-Disposition: attachment (cross-origin `a.download`
 * alone is ignored by browsers).
 */
export function startAttachmentDownload(url: string, fileName: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  // Same-tab anchor click only — do not open another browsing context.
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function requestAndStartMasterDownload(
  productId: string,
): Promise<MasterDownloadResult> {
  const id = productId.trim();
  if (!id) {
    return { ok: false, error: "Missing product" };
  }

  const res = await fetch("/api/library/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ productId: id }),
  });

  const data = (await res.json().catch(() => null)) as {
    ok?: boolean;
    error?: string;
    downloadUrl?: string;
    fileName?: string;
  } | null;

  if (!res.ok || !data?.ok || !data.downloadUrl) {
    return {
      ok: false,
      error:
        data?.error ||
        "Download is unavailable without a verified purchase.",
    };
  }

  const fileName =
    data.fileName?.trim() && data.fileName.toLowerCase().endsWith(".mp4")
      ? data.fileName.trim()
      : "download.mp4";

  startAttachmentDownload(data.downloadUrl, fileName);
  return { ok: true, fileName };
}
