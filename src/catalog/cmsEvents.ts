/** Shared CMS persistence key. */

/** Bump when seed catalog shape changes so browsers pick up new demo products. */
export const CMS_STORAGE_KEY = "rhythm-admin-cms-v8";

export const CMS_UPDATED_EVENT = "rhythm-cms-updated";

export function notifyCmsUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CMS_UPDATED_EVENT));
}
