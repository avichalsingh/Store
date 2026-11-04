/** Baseline HTTP security headers for Next responses / middleware. */

/**
 * Razorpay Standard Checkout hosts (script + iframe + XHR/telemetry).
 * Scoped to *.razorpay.com only — not a blanket https: / * wildcard.
 * checkout.razorpay.com loads checkout.js; cdn.razorpay.com serves risk-detection;
 * api / lumberjack hosts are used for frames and connect during payment.
 */
const RAZORPAY_HOST = "https://*.razorpay.com";

export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
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

export function applySecurityHeaders(headers: Headers): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }
}
