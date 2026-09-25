/**
 * Verifies the infrastructure the app depends on but cannot create for
 * itself: Firestore composite indexes, and the Supabase Storage buckets.
 *
 *   npm run verify:infra
 *
 * Checks, in order:
 *   1. every composite index in firestore.indexes.json is live (by running the
 *      query that needs it); prints a one-click console link for each one
 *      that is missing
 *   2. every Supabase bucket the app expects exists and is reachable with the
 *      service role key
 *   3. the Admin SDK can write and delete a certificate PDF (server path)
 *
 * There is no client-side Storage rules check any more: nothing in the
 * browser ever holds a Supabase key. Every upload goes through
 * POST /api/uploads with the Firebase ID token, which is what RBAC actually
 * gates — see src/app/api/uploads/route.ts.
 *
 * Needs FIREBASE_SERVICE_ACCOUNT, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createClient } from "@supabase/supabase-js";

const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim().replace(/^['"]|['"]$/g, "") ?? "";

if (!raw || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT, SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n");
  process.exit(1);
}

const account = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
if (!getApps().length) {
  initializeApp({
    credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key.replace(/\\n/g, "\n") }),
    projectId: account.project_id,
  });
}

const db = getFirestore();
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

/* ── 2. Supabase buckets ──────────────────────────────────────────────── */

console.log("\n  Supabase Storage");
const BUCKETS = { eventAssets: "event-assets", certificates: "certificates", avatars: "avatars", uploads: "uploads" };
const client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

for (const bucket of Object.values(BUCKETS)) {
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data) bad(`bucket ${bucket}`, "does not exist — create it in the Supabase dashboard (Storage → New bucket)");
  else ok(`bucket ${bucket}`, data.public ? "(public)" : "(private)");
}

/* ── 3. server-side certificate write ─────────────────────────────────── */

const probePath = `_probe/${Date.now()}.pdf`;
try {
  const { error } = await client.storage.from(BUCKETS.certificates).upload(probePath, Buffer.from("%PDF-1.4\n%probe\n"), { contentType: "application/pdf" });
  if (error) throw error;
  await client.storage.from(BUCKETS.certificates).remove([probePath]);
  ok("service role can write + delete certificates/…pdf");
} catch (error) {
  bad("service-role write to certificates/", String(error.message ?? error).slice(0, 160));
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
