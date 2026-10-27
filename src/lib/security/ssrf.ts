/**
 * Block obviously dangerous fetch targets (SSRF / metadata / loopback).
 * DNS rebinding is not fully prevented — keep timeouts and HTML-only accept.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

function isPrivateIpv4(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!m) return false;
  const parts = m.slice(1).map((p) => Number(p));
  if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIpv6(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
  if (h.startsWith("fe80")) return true; // link-local
  return false;
}

/**
 * Returns an error message if the URL must not be fetched server-side.
 */
export function assertSafeOutboundUrl(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return "Invalid URL.";
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are allowed.";
  }
  if (parsed.username || parsed.password) {
    return "URLs with embedded credentials are not allowed.";
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) return "Invalid URL host.";
  if (BLOCKED_HOSTNAMES.has(host)) {
    return "That host is not allowed.";
  }
  if (host.endsWith(".localhost") || host.endsWith(".local")) {
    return "That host is not allowed.";
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    return "Private or link-local addresses are not allowed.";
  }
  return null;
}
