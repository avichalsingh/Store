import { clearAdminSession as clearLocalAdminSession } from "@/admin/lib/auth";

/** Clear local CMS session + httpOnly publish cookie. */
export async function signOutAdmin(): Promise<void> {
  clearLocalAdminSession();
  try {
    await fetch("/api/admin/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // Local session already cleared; cookie clear is best-effort.
  }
}
