/**
 * Verifies the Firebase infrastructure the app depends on but cannot create
 * for itself: composite indexes, the Storage bucket, and the Storage rules.
 *
 *   npm run verify:infra
 *
 * Checks, in order:
 *   1. every composite index in firestore.indexes.json is live (by running the
 *      query that needs it); prints a one-click console link for each one
 *      that is missing
 *   2. the default Storage bucket exists
 *   3. the Admin SDK can write and delete a certificate PDF (server path)
 *   4. the Storage *rules* behave: an admin may upload an event poster and a
 *      fest banner, a student may not — tested through the client REST API
 *      with real ID tokens, since that is what the rules see
 *
 * Creates two throwaway Auth users and deletes them on exit. Needs
 * FIREBASE_SERVICE_ACCOUNT, NEXT_PUBLIC_FIREBASE_API_KEY and
 * NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim().replace(/^['"]|['"]$/g, "") ?? "";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "";

if (!raw || !apiKey || !bucketName) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT, NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET must be set.\n");
  process.exit(1);
}

const account = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key.replace(/\\n/g, "\n") }),
    projectId: account.project_id,
    storageBucket: bucketName,
  });
}

const db = getFirestore();
const auth = getAuth();
let passed = 0;
let failed = 0;
const ok = (label, detail = "") => { passed += 1; console.log(`  ok    ${label}${detail ? `  ${detail}` : ""}`); };
const bad = (label, detail = "") => { failed += 1; console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ""}`); };

console.log(`\n  Project: ${account.project_id}\n`);

/* ── 1. composite indexes ─────────────────────────────────────────────── */

console.log("  Composite indexes");
const indexes = JSON.parse(readFileSync(new URL("../firestore.indexes.json", import.meta.url), "utf8")).indexes;
const links = [];
for (const index of indexes) {
  let q = db.collection(index.collectionGroup);
  const label = `${index.collectionGroup}(${index.fields.map((f) => `${f.fieldPath} ${f.order ?? f.arrayConfig}`).join(", ")})`;
  for (const field of index.fields) {
    if (field.arrayConfig === "CONTAINS") q = q.where(field.fieldPath, "array-contains", "_probe_");
    else if (field.order && field.fieldPath !== "createdAt") q = q.where(field.fieldPath, "==", "_probe_");
    else q = q.orderBy(field.fieldPath, field.order === "DESCENDING" ? "desc" : "asc");
  }
  try {
    await q.limit(1).get();
    ok(label);
  } catch (error) {
    const message = String(error.message ?? error);
    const link = message.match(/https:\/\/console\.firebase\.google\.com\S+/)?.[0];
    if (link) links.push(link);
    bad(label, link ? "missing — create it with the link below" : message.slice(0, 160));
  }
}
if (links.length) {
  console.log("\n  Create the missing indexes (one click each, signed in as a project owner):");
  for (const link of links) console.log(`    ${link}`);
  console.log("\n  Or grant the service account the role \"Cloud Datastore Index Admin\" and run:  npm run firebase:deploy -- --indexes");
}

/* ── 2. bucket ────────────────────────────────────────────────────────── */

console.log("\n  Storage");
const bucket = getStorage().bucket();
const [exists] = await bucket.exists().catch(() => [false]);
if (!exists) {
  bad(`bucket ${bucket.name}`, "does not exist — Firebase console → Build → Storage → Get started, then: npm run firebase:deploy -- --rules");
} else {
  ok(`bucket ${bucket.name}`);

  /* ── 3. server-side certificate write ─────────────────────────────── */
  const probeFile = bucket.file(`certificates/_probe/${Date.now()}.pdf`);
  try {
    await probeFile.save(Buffer.from("%PDF-1.4\n%probe\n"), { contentType: "application/pdf", resumable: false });
    await probeFile.delete();
    ok("admin can write + delete certificates/…pdf");
  } catch (error) {
    bad("admin write to certificates/", String(error.message ?? error).slice(0, 160));
  }

  /* ── 4. rules through the client REST API ────────────────────────── */
  const mint = async (email, claims) => {
    const user = await auth.createUser({ email, emailVerified: true, password: `Tmp-${Math.random().toString(36).slice(2)}A1!` });
    await auth.setCustomUserClaims(user.uid, claims);
    const custom = await auth.createCustomToken(user.uid);
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    });
    const { idToken } = await res.json();
    return { uid: user.uid, idToken };
  };

  // A 1×1 PNG: enough for the rules' contentType + size checks.
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const upload = async (idToken, path, body = png, contentType = "image/png") => {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o?name=${encodeURIComponent(path)}`, {
      method: "POST",
      headers: { authorization: `Firebase ${idToken}`, "content-type": contentType },
      body,
    });
    return res.status;
  };

  const admin = await mint("ff-infra-admin@festflow.test", { role: "admin", festIds: [] });
  const student = await mint("ff-infra-student@festflow.test", { role: "student", festIds: [] });
  const stamp = Date.now();
  try {
    const cases = [
      ["admin uploads event poster", admin.idToken, `events/_probe/${stamp}.png`, 200],
      ["admin uploads fest banner", admin.idToken, `fests/_probe/${stamp}.png`, 200],
      ["student cannot upload event poster", student.idToken, `events/_probe/${stamp}-s.png`, 403],
      ["student cannot upload fest banner", student.idToken, `fests/_probe/${stamp}-s.png`, 403],
      ["student uploads own profile photo", student.idToken, `users/${student.uid}/${stamp}.png`, 200],
      ["student cannot write certificates/", student.idToken, `certificates/${student.uid}/${stamp}.pdf`, 403],
    ];
    for (const [label, token, path, expected] of cases) {
      const status = await upload(token, path, path.endsWith(".pdf") ? Buffer.from("%PDF-1.4") : png, path.endsWith(".pdf") ? "application/pdf" : "image/png");
      if (status === expected) ok(label, `(${status})`);
      else bad(label, `expected ${expected}, got ${status}${status === 403 && expected === 200 ? " — are the Storage rules deployed?" : ""}`);
      if (status === 200) await bucket.file(path).delete().catch(() => undefined);
    }
    // Oversize / wrong type must be refused even for admins.
    const big = await upload(admin.idToken, `events/_probe/${stamp}-big.png`, Buffer.alloc(5 * 1024 * 1024 + 1), "image/png");
    if (big === 403) ok("admin cannot upload a >5 MB image", "(403)"); else { bad("admin oversize image", `got ${big}`); await bucket.file(`events/_probe/${stamp}-big.png`).delete().catch(() => undefined); }
    const wrong = await upload(admin.idToken, `events/_probe/${stamp}.txt`, Buffer.from("hi"), "text/plain");
    if (wrong === 403) ok("admin cannot upload a non-image as a poster", "(403)"); else { bad("admin wrong type", `got ${wrong}`); await bucket.file(`events/_probe/${stamp}.txt`).delete().catch(() => undefined); }
  } finally {
    await Promise.all([auth.deleteUser(admin.uid), auth.deleteUser(student.uid)]);
  }
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
