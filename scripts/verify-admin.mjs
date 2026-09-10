/**
 * Checks that FIREBASE_SERVICE_ACCOUNT is present, parseable, and actually
 * accepted by Firebase.
 *
 * A bad service account fails deep inside the SDK with a message about PEM
 * parsing or a 401 from a token endpoint, usually at the moment a user is
 * waiting on a request. Running this first turns that into a clear answer.
 *
 *   npm run verify:admin
 *
 * Prints no secret material.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const fail = (message) => {
  console.error(`\n  FAIL  ${message}\n`);
  process.exit(1);
};

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!raw || !raw.trim()) {
  fail(
    "FIREBASE_SERVICE_ACCOUNT is not set.\n" +
      "        Add it to .env.local, then run: npm run verify:admin",
  );
}

const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
let text = trimmed;

if (!trimmed.startsWith("{")) {
  try {
    text = Buffer.from(trimmed, "base64").toString("utf8");
  } catch {
    fail("The value is neither JSON nor valid base64.");
  }
}

let account;

try {
  account = JSON.parse(text);
} catch {
  fail(
    "The value did not parse as JSON.\n" +
      "        A raw paste breaks because the private key contains newlines,\n" +
      "        which .env files only keep inside quotes. Base64-encode it.",
  );
}

for (const field of ["project_id", "client_email", "private_key"]) {
  if (!account[field]) fail(`The service account JSON has no "${field}".`);
}

console.log("  Service account parsed");
console.log(`    project_id   : ${account.project_id}`);
console.log(`    client_email : ${account.client_email}`);

const webProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

if (webProject && webProject !== account.project_id) {
  fail(
    `Project mismatch.\n` +
      `        Web config points at "${webProject}"\n` +
      `        but the service account belongs to "${account.project_id}".\n` +
      `        ID tokens from one project are rejected by the other, so every\n` +
      `        authenticated request would fail with "session expired".`,
  );
}

console.log("  Web config and service account agree on the project");

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

// Exercise both services the routes depend on. Either can fail independently:
// the key can be valid while the Firestore API is disabled on the project.
try {
  const users = await getAuth().listUsers(1);
  console.log(`  Auth reachable (${users.users.length ? "accounts exist" : "no accounts yet"})`);
} catch (error) {
  fail(`Auth rejected the credentials: ${error.message}`);
}

try {
  const snapshot = await getFirestore().collection("users").limit(1).get();
  console.log(`  Firestore reachable (users collection: ${snapshot.size} doc(s) sampled)`);
} catch (error) {
  fail(`Firestore rejected the credentials: ${error.message}`);
}

console.log("\n  Firebase Admin is configured correctly.\n");
process.exit(0);
