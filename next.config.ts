import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security headers on every response.
 *
 * HSTS is preload-grade (two years, subdomains). The CSP is report-only
 * here to start with: Next's inline runtime, Firebase's endpoints and the
 * reCAPTCHA/Sentry scripts each need an allowance, and a wrong entry blocks
 * the app for everyone — so the policy ships observing first and is
 * switched to enforcing once the report stream is clean.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  // firebasestorage.googleapis.com stays allowed for images uploaded before
  // the Supabase Storage migration — their URLs are already persisted in
  // Firestore documents and are not backfilled.
  "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://*.supabase.co https://lh3.googleusercontent.com https://www.gstatic.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://va.vercel-scripts.com https://vercel.live",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebase.googleapis.com https://www.google.com https://*.sentry.io https://*.ingest.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com",
  "frame-src https://www.google.com https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: {
    dirs: ["src", "tests"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Pre-migration uploads: URLs already stored in Firestore, not backfilled.
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Static, immutable assets and the icons.
      { source: "/(icon.svg|favicon.ico|apple-icon.png|manifest.webmanifest|opengraph-image.png)", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
  async redirects() {
    return [
      // One canonical host. www → apex, permanently.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.plansphere.in" }],
        destination: "https://plansphere.in/:path*",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Source maps are uploaded only when a token is present (Vercel env); the
  // build never fails for want of Sentry.
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  disableLogger: true,
  // Errors only on the client: tracing and replay are compiled out, which
  // takes the browser SDK from ~340 kB to a fraction of that.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeTracing: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  telemetry: false,
});
