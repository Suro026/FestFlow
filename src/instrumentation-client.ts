import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side Sentry. Loaded by Next before hydration. Disabled without a
 * DSN. Replays are off — a fest app handles personal data and the value of
 * session replay does not justify recording students' screens.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  // Errors only. Performance tracing is excluded from the bundle (see
  // next.config bundleSizeOptimizations); Vercel Speed Insights covers vitals.
  sendDefaultPii: false,
  ignoreErrors: [
    // Browser noise, not application errors.
    "ResizeObserver loop",
    "AbortError",
    /Loading chunk \d+ failed/,
    /NotAllowedError/, // camera permission refused on the scanner
  ],
});
