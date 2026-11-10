import type { HomepageConfigDocument } from "@/admin/types";
import { notifyHomepagePublished } from "@/catalog/cmsEvents";
import { homepagePublishUserMessage } from "@/catalog/homepageRemotePublish";

export type PublishHomepageResult =
  | {
      ok: true;
      id: string;
      dryRun: boolean;
      publishedRevision: number;
      publishedAt: string | null;
      message: string;
    }
  | {
      ok: false;
      error: string;
      status: number;
      currentPublishedRevision?: number;
    };

type PublishBody = {
  error?: string;
  ok?: boolean;
  dryRun?: boolean;
  id?: string;
  message?: string;
  publishedRevision?: number;
  publishedAt?: string | null;
  currentPublishedRevision?: number;
};

/**
 * Publish the local HomepageConfigDocument draft to Supabase
 * (gated by HOMEPAGE_REMOTE_PUBLISH).
 */
export async function publishHomepageToCatalog(
  document: HomepageConfigDocument,
  expectedPublishedRevision?: number,
): Promise<PublishHomepageResult> {
  let response: Response;
  try {
    response = await fetch("/api/admin/homepage/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        document,
        ...(expectedPublishedRevision !== undefined
          ? { expectedPublishedRevision }
          : {}),
      }),
    });
  } catch {
    return {
      ok: false,
      error: "Could not reach the homepage publish API",
      status: 0,
    };
  }

  let body: PublishBody = {};
  try {
    body = (await response.json()) as PublishBody;
  } catch {
    body = {};
  }

  if (!response.ok) {
    const fallback =
      response.status === 401
        ? "Admin session expired or invalid. Sign out and sign in with the admin API password."
        : response.status === 409
          ? "Homepage publish conflict: another publish updated the storefront. Refresh and try again."
          : "Failed to publish homepage to the storefront";
    return {
      ok: false,
      error: typeof body.error === "string" ? body.error : fallback,
      status: response.status,
      currentPublishedRevision:
        typeof body.currentPublishedRevision === "number"
          ? body.currentPublishedRevision
          : undefined,
    };
  }

  const dryRun = Boolean(body.dryRun);
  const publishedRevision =
    typeof body.publishedRevision === "number" ? body.publishedRevision : 0;
  const message =
    typeof body.message === "string" && body.message.trim()
      ? body.message
      : homepagePublishUserMessage(dryRun);

  if (!dryRun) {
    notifyHomepagePublished();
  }

  return {
    ok: true,
    id: body.id ?? "default",
    dryRun,
    publishedRevision,
    publishedAt:
      typeof body.publishedAt === "string" ? body.publishedAt : null,
    message,
  };
}
