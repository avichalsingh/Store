export type AdminSession = {
  email: string;
  name: string;
  loggedInAt: string;
};

const AUTH_KEY = "rhythm-admin-auth-v1";

export function getAdminSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setAdminSession(session: AdminSession): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export function clearAdminSession(): void {
  localStorage.removeItem(AUTH_KEY);
}
