import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/health — step-by-step diagnostics for the server side.
 *
 * Every check is isolated: this module has no static import of the Firebase
 * Admin layer, so it still answers when that layer cannot even be loaded.
 * Each step reports `ok` or the error's name + message, never a secret — the
 * service account is described by project id and a masked client email.
 *
 * Public on purpose: it exposes nothing a caller could not learn from a
 * failing request, and it is the first URL to open when production misbehaves.
 */

interface Step {
  ok: boolean;
  ms: number;
  detail?: Record<string, unknown>;
  error?: { name: string; message: string };
}

const describe = (error: unknown) => ({
  name: error instanceof Error ? error.name : "Error",
  message: error instanceof Error ? error.message : String(error),
});

const step = async (run: () => Promise<Record<string, unknown> | void>): Promise<Step> => {
  const started = Date.now();
  try {
    const detail = await run();
    return { ok: true, ms: Date.now() - started, ...(detail ? { detail } : {}) };
  } catch (error) {
    return { ok: false, ms: Date.now() - started, error: describe(error) };
  }
};

const mask = (email: string) => {
  const [user = "", domain = ""] = email.split("@");
  return `${user.slice(0, 4)}…@${domain}`;
};

export async function GET() {
  const checks: Record<string, Step> = {};

  // 1. Runtime facts — the first thing to compare against a working machine.
  checks.runtime = await step(async () => ({
    node: process.version,
    platform: process.platform,
    vercel: Boolean(process.env.VERCEL),
    region: process.env.VERCEL_REGION ?? null,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || null,
  }));

  // 2. Environment variables present? (names only, never values)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT ?? "";
  checks.env = await step(async () => ({
    FIREBASE_SERVICE_ACCOUNT: raw.trim().length > 0,
    serviceAccountLength: raw.trim().length,
    serviceAccountShape: !raw.trim() ? "missing" : raw.trim().startsWith("{") ? "json" : "base64",
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER ?? "console (default)",
  }));

  // 3. Can the service account be parsed? (project id + masked email only)
  checks.serviceAccountParse = await step(async () => {
    const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
    if (!trimmed) throw new Error("FIREBASE_SERVICE_ACCOUNT is empty");
    const text = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
    const parsed = JSON.parse(text) as { project_id?: string; client_email?: string; private_key?: string };
    return {
      project_id: parsed.project_id ?? null,
      client_email: parsed.client_email ? mask(parsed.client_email) : null,
      privateKeyPresent: Boolean(parsed.private_key),
      privateKeyHasNewlines: Boolean(parsed.private_key?.includes("\n")),
      privateKeyHasEscapedNewlines: Boolean(parsed.private_key?.includes("\\n")),
    };
  });

  // 4. Can the Admin SDK modules even be loaded? (this is where a bundling or
  //    file-tracing problem on the host shows up)
  checks.importFirebaseAdmin = await step(async () => {
    const app = await import("firebase-admin/app");
    const firestore = await import("firebase-admin/firestore");
    await import("firebase-admin/auth");
    await import("firebase-admin/storage");
    return { sdkVersion: (app as { SDK_VERSION?: string }).SDK_VERSION ?? null, hasFieldValue: typeof firestore.FieldValue === "function" };
  });

  // 5. Can our own server module load, and does it initialize?
  let admin: typeof import("@/server/firebase-admin") | null = null;
  checks.importServerModule = await step(async () => {
    admin = await import("@/server/firebase-admin");
    return { configured: admin.isAdminConfigured() };
  });

  checks.adminInit = await step(async () => {
    if (!admin) throw new Error("server module did not load");
    const app = admin.getAdminApp();
    return { appName: app.name, projectId: app.options.projectId ?? null, storageBucket: app.options.storageBucket ?? null };
  });

  // 6. A real Firestore read with the admin credential.
  checks.firestoreRead = await step(async () => {
    if (!admin) throw new Error("server module did not load");
    const snap = await admin.adminDb().collection(admin.COLLECTIONS.fests).limit(1).get();
    return { fests: snap.size };
  });

  // 7. The composite indexes the admin tables depend on.
  checks.firestoreIndexes = await step(async () => {
    if (!admin) throw new Error("server module did not load");
    const db = admin.adminDb();
    const probes: Array<[string, FirebaseFirestore.Query]> = [
      ["registrations festId+createdAt", db.collection("registrations").where("festId", "==", "_").orderBy("createdAt", "desc").limit(1)],
      ["registrations eventId+createdAt", db.collection("registrations").where("eventId", "==", "_").orderBy("createdAt", "desc").limit(1)],
      ["registrations festId+status+createdAt", db.collection("registrations").where("festId", "==", "_").where("status", "==", "confirmed").orderBy("createdAt", "desc").limit(1)],
      ["registrations eventId+status+createdAt", db.collection("registrations").where("eventId", "==", "_").where("status", "==", "confirmed").orderBy("createdAt", "desc").limit(1)],
      ["users role+createdAt", db.collection("users").where("role", "==", "student").orderBy("createdAt", "desc").limit(1)],
    ];
    const missing: string[] = [];
    for (const [label, q] of probes) {
      try {
        await q.get();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (/index/i.test(message)) missing.push(label);
        else throw error;
      }
    }
    if (missing.length) throw new Error(`Missing composite indexes: ${missing.join("; ")}`);
    return { probed: probes.length };
  });

  // 8. Storage bucket reachable?
  checks.storage = await step(async () => {
    if (!admin) throw new Error("server module did not load");
    const bucket = admin.adminStorage().bucket();
    const [exists] = await bucket.exists();
    if (!exists) throw new Error(`Bucket ${bucket.name} does not exist — initialize Storage in the Firebase console`);
    return { bucket: bucket.name };
  });

  // 9. Auth admin reachable (a metadata call that needs no user).
  checks.authAdmin = await step(async () => {
    if (!admin) throw new Error("server module did not load");
    const list = await admin.adminAuth().listUsers(1);
    return { reachable: true, sampled: list.users.length };
  });

  const healthy = Object.values(checks).every((c) => c.ok);
  const response = NextResponse.json({ ok: healthy, checkedAt: new Date().toISOString(), checks }, { status: healthy ? 200 : 503 });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
