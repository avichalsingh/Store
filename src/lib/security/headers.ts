/** Baseline HTTP security headers for Next responses / middleware. */

/**
 * Razorpay Standard Checkout hosts (script + iframe + XHR/telemetry).
 * Scoped to *.razorpay.com only — not a blanket https: / * wildcard.
 * checkout.razorpay.com loads checkout.js; cdn.razorpay.com serves risk-detection;
 * api / lumberjack hosts are used for frames and connect during payment.
 */
const RAZORPAY_HOST = "https://*.razorpay.com";

/**
 * Default COOP for non-storefront surfaces (admin UI, APIs, auth callbacks).
 * Keeps browsing-context isolation; do not relax these to allow-popups.
 */
export const COOP_DEFAULT = "same-origin";

/**
 * Storefront document COOP for Razorpay Standard Checkout.
 * Card / netbanking bank-auth uses Window.open() to a cross-origin page that
 * typically has no COOP (unsafe-none). With COOP `same-origin`, that popup is
 * process-isolated and the opener relationship is severed — browsers leave the
 * window at about:blank after mocksharp returns callback_url.
 * `same-origin-allow-popups` keeps isolation for navigations while allowing
 * Window.open() to unsafe-none targets (MDN: payments / OAuth).
 *
 * Applied to all public storefront HTML documents (not an allowlist of a few
 * paths): App Router soft-nav from /videos, /explore, PDPs, etc. into /checkout
 * retains the opener document's COOP. Admin / API / auth stay on COOP_DEFAULT.
 */
export const COOP_STOREFRONT = "same-origin-allow-popups";

function matchesPathOrPrefix(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Storefront HTML documents (browse, PDP, cart drawer hosts, checkout, account).
 * Exclude privileged / non-document namespaces that must keep COOP_DEFAULT.
 */
export function isStorefrontDocumentPath(pathname: string): boolean {
  if (matchesPathOrPrefix(pathname, "/admin")) return false;
  if (matchesPathOrPrefix(pathname, "/api")) return false;
  if (matchesPathOrPrefix(pathname, "/auth")) return false;
  return true;
}

export function resolveCrossOriginOpenerPolicy(pathname?: string): string {
  if (pathname && isStorefrontDocumentPath(pathname)) {
    return COOP_STOREFRONT;
  }
  return COOP_DEFAULT;
}

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": COOP_DEFAULT,
  // Compatible baseline CSP — allows Next/Turbopack inline and Supabase media.
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https://*.supabase.co",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Razorpay Checkout: checkout.js + secondary scripts (e.g. cdn risk-detection).
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${RAZORPAY_HOST}`,
    // Checkout modal / bank OTP frames.
    `frame-src 'self' ${RAZORPAY_HOST}`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${RAZORPAY_HOST}`,
    "upgrade-insecure-requests",
  ].join("; "),
};

export function applySecurityHeaders(
  headers: Headers,
  options?: { pathname?: string },
): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
  headers.set(
    "Cross-Origin-Opener-Policy",
    resolveCrossOriginOpenerPolicy(options?.pathname),
  );
}
