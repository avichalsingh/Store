/** Baseline HTTP security headers for Next responses / middleware. */

/**
 * Razorpay Standard Checkout hosts (script + iframe + XHR/telemetry).
 * Scoped to *.razorpay.com only — not a blanket https: / * wildcard.
 * checkout.razorpay.com loads checkout.js; cdn.razorpay.com serves risk-detection;
 * api / lumberjack hosts are used for frames and connect during payment.
 */
const RAZORPAY_HOST = "https://*.razorpay.com";

/**
 * Site-wide COOP — isolates the browsing context group to same-origin documents.
 * Do not relax globally; payment popups need a path-scoped exception (below).
 */
export const COOP_DEFAULT = "same-origin";

/**
 * Checkout-flow document COOP for Razorpay Standard Checkout.
 * Card / netbanking bank-auth uses Window.open() to a cross-origin page that
 * typically has no COOP (unsafe-none). With COOP `same-origin`, that popup is
 * process-isolated and the opener relationship is severed — browsers leave the
 * window at about:blank after mocksharp returns callback_url.
 * `same-origin-allow-popups` keeps isolation for navigations while allowing
 * Window.open() to unsafe-none targets (MDN: payments / OAuth).
 *
 * Must cover documents that can soft-navigate into checkout (App Router does not
 * re-apply COOP on client transitions): `/`, `/signin`, `/cart`, `/checkout`.
 */
export const COOP_CHECKOUT = "same-origin-allow-popups";

function matchesPathOrPrefix(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Storefront documents that may initiate or soft-navigate into Razorpay Checkout.
 * Unrelated routes keep COOP_DEFAULT.
 */
export function isCheckoutFlowDocumentPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return (
    matchesPathOrPrefix(pathname, "/signin") ||
    matchesPathOrPrefix(pathname, "/cart") ||
    matchesPathOrPrefix(pathname, "/checkout")
  );
}

export function resolveCrossOriginOpenerPolicy(pathname?: string): string {
  if (pathname && isCheckoutFlowDocumentPath(pathname)) {
    return COOP_CHECKOUT;
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
