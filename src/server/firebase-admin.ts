import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

/**
 * The Firebase Admin SDK. Server only.
 *
 * Everything here runs with full privileges and bypasses every rule in
 * firestore.rules. That is the entire reason the privileged operations live
 * behind API routes: the route checks who is calling and what they are allowed
 * to do, and only then touches the database. A bug that skips the check here
 * is equivalent to having no security rules at all.
 *
 * Importing this from a client component is a build error waiting to happen —
 * `firebase-admin` cannot bundle for the browser — but the explicit guard
 * below turns a confusing bundler failure into a sentence that says what went
 * wrong.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/server/firebase-admin.ts was imported into client code. It holds " +
      "credentials that bypass all security rules and must only be used from " +
      "route handlers and server components.",
  );
}

const APP_NAME = "festflow-admin";

/** Thrown when the service account is absent or unusable. */
export class AdminNotConfiguredError extends Error {
  constructor(detail: string) {
    super(
      `Firebase Admin is not configured: ${detail} ` +
        `Set FIREBASE_SERVICE_ACCOUNT in .env.local (see .env.example).`,
    );
    this.name = "AdminNotConfiguredError";
  }
}

interface ServiceAccountJson {
  project_id: string;
  client_email: string;
  private_key: string;
}

/**
 * Accepts the service account as raw JSON or base64-encoded JSON.
 *
 * Base64 is what the setup writes, because a PEM private key contains newlines
 * and `.env` files only preserve those inside quotes — a raw paste silently
 * truncates at the first line break, which fails much later with an opaque
 * "invalid PEM" from the crypto layer.
 */
const parseServiceAccount = (raw: string): ServiceAccountJson => {
  const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");

  let text = trimmed;

  if (!trimmed.startsWith("{")) {
    try {
      text = Buffer.from(trimmed, "base64").toString("utf8");
    } catch {
      throw new AdminNotConfiguredError("the value is neither JSON nor valid base64.");
    }
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AdminNotConfiguredError(
      "the value did not parse as JSON. If you pasted the key directly, " +
        "the newlines in `private_key` will have broken it — base64-encode it instead.",
    );
  }

  const account = parsed as Partial<ServiceAccountJson>;

  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new AdminNotConfiguredError(
      "the JSON is missing project_id, client_email or private_key.",
    );
  }

  return {
    project_id: account.project_id,
    client_email: account.client_email,
    // Tolerate a key whose newlines survived as the literal characters \n.
    private_key: account.private_key.replace(/\\n/g, "\n"),
  };
};

let cached: App | null = null;

const adminApp = (): App => {
  if (cached) return cached;

  const existing = getApps().find((app) => app.name === APP_NAME);

  if (existing) {
    cached = existing;
    return cached;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw || !raw.trim()) {
    throw new AdminNotConfiguredError("FIREBASE_SERVICE_ACCOUNT is empty.");
  }

  const account = parseServiceAccount(raw);

  cached = initializeApp(
    {
      credential: cert({
        projectId: account.project_id,
        clientEmail: account.client_email,
        privateKey: account.private_key,
      }),
      projectId: account.project_id,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    APP_NAME,
  );

  return cached;
};

export const adminAuth = (): Auth => getAuth(adminApp());

export const adminDb = (): Firestore => getFirestore(adminApp());

export const adminStorage = (): Storage => getStorage(adminApp());

/** True when the service account is present and parseable. */
export const isAdminConfigured = (): boolean => {
  try {
    adminApp();
    return true;
  } catch {
    return false;
  }
};

/** Re-export so route handlers can build server timestamps and increments. */
export { FieldValue, Timestamp } from "firebase-admin/firestore";

/** Collection names, mirroring the client-side constant. */
export const COLLECTIONS = {
  users: "users",
  fests: "fests",
  events: "events",
  registrations: "registrations",
  attendance: "attendance",
  results: "results",
  certificates: "certificates",
  foodCollections: "foodCollections",
  notifications: "notifications",
  shifts: "shifts",
} as const;

/** Ensures the app is only ever initialised once per process. */
export const getAdminApp = adminApp;
