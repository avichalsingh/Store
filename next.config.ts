import type { NextConfig } from "next";

/**
 * Staging local launcher (`npm run dev:staging`) sets PRAGVI_LOCAL_STAGING=1 so
 * Turbopack/build artifacts never share the production-dev `.next` directory.
 * Ordinary `npm run dev` keeps the default `.next`.
 * PRAGVI_VERIFY_DIST_DIR (e.g. `.next-kyc-verify`) isolates one-off build
 * checks from both `.next` and the live staging `.next-staging` tree.
 */
const verifyDistDir = process.env.PRAGVI_VERIFY_DIST_DIR?.trim();
const useStagingDistDir = process.env.PRAGVI_LOCAL_STAGING === "1";

const nextConfig: NextConfig = {
  ...(verifyDistDir
    ? { distDir: verifyDistDir }
    : useStagingDistDir
      ? { distDir: ".next-staging" }
      : {}),
  poweredByHeader: false,
  // Let middleware own trailing-slash redirects. Next's built-in 308 uses a
  // bare path body with no Content-Type; with nosniff that can download as a
  // file named after the last path segment (e.g. refreshing /admin/homepage/).
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
