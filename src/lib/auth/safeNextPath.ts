/**
 * Prevent open redirects after Auth. Only same-origin relative paths allowed.
 * Normalizes `.` / `..` and rejects traversal that escapes the storefront.
 */

const DEFAULT_NEXT = "/account";

const BLOCKED_EXACT = new Set(["/signin", "/auth", "/api", "/admin"]);
const BLOCKED_PREFIXES = ["/signin/", "/auth/", "/api/", "/admin/"];

function decodePathSegment(segment: string): string | null {
  let current = segment;
  for (let i = 0; i < 3; i += 1) {
    try {
      const decoded = decodeURIComponent(current.replace(/\+/g, " "));
      if (decoded === current) break;
      current = decoded;
    } catch {
      return null;
    }
  }
  // Encoded separators / NUL must never appear inside a single segment.
  if (
    current.includes("/") ||
    current.includes("\\") ||
    current.includes("\0") ||
    current.includes("\r") ||
    current.includes("\n")
  ) {
    return null;
  }
  return current;
}

/** Resolve `.` / `..` after decoding; null if traversal escapes root. */
export function normalizeAppPathname(pathname: string): string | null {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) return null;

  const segments = pathname.split("/");
  const resolved: string[] = [];

  for (const segment of segments) {
    if (segment === "") continue;
    const decoded = decodePathSegment(segment);
    if (decoded === null) return null;
    if (decoded === ".") continue;
    if (decoded === "..") {
      if (resolved.length === 0) return null;
      resolved.pop();
      continue;
    }
    resolved.push(decoded);
  }

  return `/${resolved.join("/")}`;
}

function isBlockedPath(pathname: string): boolean {
  if (BLOCKED_EXACT.has(pathname)) return true;
  return BLOCKED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function safeNextPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_NEXT,
): string {
  if (typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\") || trimmed.includes("://")) return fallback;

  // Drop query/hash — auth return destinations are path-only.
  const pathOnly = trimmed.split("?")[0]?.split("#")[0] || "";
  const normalized = normalizeAppPathname(pathOnly);
  if (!normalized || normalized === "/") return fallback;
  if (isBlockedPath(normalized)) return fallback;

  return normalized;
}

export function buildAuthCallbackUrl(origin: string, next: string): string {
  const safe = safeNextPath(next);
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safe);
  return url.toString();
}
