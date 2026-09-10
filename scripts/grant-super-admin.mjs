/**
 * Seeds the first super admin.
 *
 * Staff accounts are invite-only and only a super admin can issue an invite,
 * which leaves a chicken-and-egg problem the first time the project is set up.
 * This script is the way out of it, and it is deliberately a local script
 * rather than an HTTP route: an endpoint that can mint a super admin is a
 * permanent back door, however well guarded.
 *
 *   npm run grant-super-admin -- someone@college.edu
 *
 * Works whether or not the address already has an account. If it does not, one
 * is created and a password-set link is printed.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = (process.argv[2] ?? process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();

if (!email) {
  console.error(
    "\n  Usage: npm run grant-super-admin -- someone@college.edu" +
      "\n  (or set SUPER_ADMIN_EMAIL in .env.local)\n",
  );
  process.exit(1);
}

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error(`\n  "${email}" does not look like an email address.\n`);
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!raw?.trim()) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.\n");
  process.exit(1);
}

const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
const text = trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8");
const account = JSON.parse(text);

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: account.project_id,
      clientEmail: account.client_email,
      privateKey: account.private_key.replace(/\\n/g, "\n"),
    }),
    projectId: account.project_id,
  });
}

const auth = getAuth();
const db = getFirestore();

const randomPassword = () => {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return `Aa1!${Buffer.from(bytes).toString("base64url")}`;
};

let user;
let createdNow = false;

try {
  user = await auth.getUserByEmail(email);
  console.log(`  Found existing account: ${user.uid}`);
} catch (error) {
  if (error.code !== "auth/user-not-found") throw error;

  user = await auth.createUser({
    email,
    password: randomPassword(),
    emailVerified: false,
    disabled: false,
  });

  createdNow = true;
  console.log(`  Created account: ${user.uid}`);
}

await auth.setCustomUserClaims(user.uid, { role: "super_admin", festIds: [] });

// Any token already issued still carries the old role, and would keep doing so
// for up to an hour. Revoking forces the next request to mint a fresh one.
await auth.revokeRefreshTokens(user.uid);

const ref = db.collection("users").doc(user.uid);
const existing = await ref.get();

await ref.set(
  {
    id: user.uid,
    email,
    fullName: user.displayName || existing.data()?.fullName || "Super Admin",
    role: "super_admin",
    emailVerified: user.emailVerified,
    disabled: false,
    organizer: { festIds: [] },
    updatedAt: FieldValue.serverTimestamp(),
    ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  },
  { merge: true },
);

console.log(`  Role set to super_admin and profile written.`);

if (createdNow || !user.emailVerified) {
  const link = await auth.generatePasswordResetLink(email);
  console.log("\n  Set the password using this link (it expires):\n");
  console.log(`    ${link}\n`);
}

console.log("  Done. Sign out and back in for the new role to take effect.\n");
process.exit(0);
