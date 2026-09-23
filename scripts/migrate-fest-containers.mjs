/**
 * Backfills the fest container fields added with the super admin module.
 *
 *   npm run migrate:fests -- --dry-run     # report only, writes nothing
 *   npm run migrate:fests                  # apply
 *
 * What it sets, per fest, only where the field is missing:
 *   festType            "other" — the kind of fest is a decision, not a guess
 *   visibility          "public" — how every existing fest already behaved
 *   registrationState   "open" for a fest that has not ended, "closed" after
 *   ownerId             from `createdBy`, which is who has been running it
 *   registrationFields  the default question set
 *   academicYear        derived from the start date (an Indian session runs
 *                       June–May, so January–May belongs to the year before)
 *
 * Nothing is overwritten and nothing is deleted: a fest that already carries
 * a field keeps whatever it says. Idempotent — the second run reports zero.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const dryRun = process.argv.includes("--dry-run");

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw?.trim()) {
  console.error("\n  FIREBASE_SERVICE_ACCOUNT is not set. See .env.example.\n");
  process.exit(1);
}
const trimmed = raw.trim().replace(/^['"]|['"]$/g, "");
const account = JSON.parse(trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf8"));

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

const db = getFirestore();

/** The same default set the app ships, kept in step by hand — scripts cannot import TS. */
const DEFAULT_REGISTRATION_FIELDS = {
  builtIn: {
    fullName: "required",
    email: "required",
    phone: "required",
    college: "required",
    department: "optional",
    year: "optional",
    gender: "hidden",
    rollNumber: "hidden",
    city: "hidden",
    github: "hidden",
    linkedin: "hidden",
    resume: "hidden",
  },
  custom: [],
};

/** "2025-26" from a start date, on a June–May academic session. */
const academicYearFor = (startDate) => {
  const match = /^(\d{4})-(\d{2})/.exec(String(startDate ?? ""));
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const start = month >= 6 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
};

console.log(`\n  Project: ${account.project_id}${dryRun ? "   (dry run — nothing will be written)" : ""}\n`);

const snapshot = await db.collection("fests").get();
console.log(`  ${snapshot.size} fest(s)\n`);

const today = new Date().toISOString().slice(0, 10);
const summary = { migrated: 0, unchanged: 0, failed: 0 };

for (const doc of snapshot.docs) {
  const data = doc.data();
  const next = {};

  if (data.festType === undefined) next.festType = "other";
  if (data.visibility === undefined) next.visibility = "public";
  if (data.registrationState === undefined) {
    next.registrationState = String(data.endDate ?? "") >= today ? "open" : "closed";
  }
  if (data.ownerId === undefined && data.createdBy) next.ownerId = data.createdBy;
  if (data.registrationFields === undefined) next.registrationFields = DEFAULT_REGISTRATION_FIELDS;
  if (data.academicYear === undefined) {
    const year = academicYearFor(data.startDate);
    if (year) next.academicYear = year;
  }

  if (Object.keys(next).length === 0) {
    summary.unchanged += 1;
    continue;
  }

  console.log(`  ${String(data.name ?? doc.id).padEnd(28)} + ${Object.keys(next).join(", ")}`);

  if (!dryRun) {
    try {
      await doc.ref.set({ ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      summary.migrated += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`    failed: ${error.message}`);
    }
  } else {
    summary.migrated += 1;
  }
}

console.log(`
  fests migrated  : ${summary.migrated}
  already current : ${summary.unchanged}
  failures        : ${summary.failed}
`);

console.log(dryRun ? "  Dry run complete. Re-run without --dry-run to apply.\n" : "  Done.\n");
process.exit(summary.failed > 0 ? 1 : 0);
