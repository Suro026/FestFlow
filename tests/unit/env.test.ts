import { describe, expect, it } from "vitest";
import { validateEnv } from "@/server/env";

const complete = {
  VERCEL_ENV: "production",
  NEXT_PUBLIC_FIREBASE_API_KEY: "k",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "p.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "p",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "p.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1:web:x",
  NEXT_PUBLIC_APP_URL: "https://plansphere.in",
  FIREBASE_SERVICE_ACCOUNT: "eyJ...",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_x",
  CRON_SECRET: "0123456789abcdef0123",
  NEXT_PUBLIC_SENTRY_DSN: "https://abc@o1.ingest.sentry.io/1",
} as NodeJS.ProcessEnv;

describe("validateEnv", () => {
  it("passes a complete production environment with every feature on", () => {
    const r = validateEnv(complete);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
    expect(r.features).toEqual({ email: "resend", cron: true, sentry: true, appCheck: "off", rateLimitStore: "memory" });
  });

  it("treats missing required variables as errors in production, warnings elsewhere", () => {
    const missing = { ...complete } as Record<string, string | undefined>;
    delete missing.FIREBASE_SERVICE_ACCOUNT;
    delete missing.NEXT_PUBLIC_APP_URL;
    const prod = validateEnv(missing as NodeJS.ProcessEnv);
    expect(prod.ok).toBe(false);
    expect(prod.issues.filter((i) => i.level === "error").map((i) => i.key).sort()).toEqual(["FIREBASE_SERVICE_ACCOUNT", "NEXT_PUBLIC_APP_URL"]);

    const dev = validateEnv({ ...missing, VERCEL_ENV: "preview" } as NodeJS.ProcessEnv);
    expect(dev.ok).toBe(true);
    expect(dev.issues.every((i) => i.level === "warning")).toBe(true);
  });

  it("warns about degraded features without failing", () => {
    const r = validateEnv({ ...complete, EMAIL_PROVIDER: "console", CRON_SECRET: undefined, NEXT_PUBLIC_SENTRY_DSN: undefined } as NodeJS.ProcessEnv);
    expect(r.ok).toBe(true);
    expect(r.issues.map((i) => i.key).sort()).toEqual(["CRON_SECRET", "EMAIL_PROVIDER", "NEXT_PUBLIC_SENTRY_DSN"]);
    expect(r.features.email).toBe("console");
  });

  it("refuses App Check enforcement without a site key", () => {
    const r = validateEnv({ ...complete, APP_CHECK_ENFORCE: "true" } as NodeJS.ProcessEnv);
    expect(r.ok).toBe(false);
    expect(r.issues.find((i) => i.level === "error")?.key).toBe("NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY");
    expect(validateEnv({ ...complete, APP_CHECK_ENFORCE: "true", NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY: "site" } as NodeJS.ProcessEnv).features.appCheck).toBe("enforced");
  });

  it("does not require the service account when running against the emulator", () => {
    const r = validateEnv({ ...complete, FIREBASE_SERVICE_ACCOUNT: undefined, FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080" } as NodeJS.ProcessEnv);
    expect(r.ok).toBe(true);
  });
});
