/**
 * Migrates the `users` collection and every Auth custom claim to the unified
 * RBAC model.
 *
 *   npm run migrate:rbac -- --dry-run     # report only, writes nothing
 *   npm run migrate:rbac                  # apply
 *
 * What it does, per account:
 *   role      "organizer" becomes "volunteer"; everything else is kept
 *   name      from `fullName`
 *   avatar    from `photoUrl`
 *   college / department / year / studentId   out of the nested `student` block
 *   designation                               out of the nested `organizer` block
 *   festIds   out of `organizer.festIds`, top level now
 *   uid       set equal to the document id
 *   profileCompleted   computed: staff are complete, a student needs a name,
 *                      a phone and a college
 *   mustChangePassword false unless already set — existing accounts chose
 *                      their own passwords, so nothing is forced on them
 *   createdBy          from the old `invitedBy`, when present
 *   claims    role + festIds re-set from the migrated document
 *
 * Nothing is deleted. The legacy fields stay in place so a rollback is a
 * matter of redeploying the previous build, and `normalizeUserDoc` in the app
 * reads either shape regardless.
 *
 * Idempotent: running it twice changes nothing the second time.
 */

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

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
const auth = getAuth();

const ROLES = new Set(["student", "volunteer", "admin", "super_admin"]);

const migrateRole = (role) => (role === "organizer" ? "volunteer" : ROLES.has(role) ? role : "student");

const asStrings = (value) => (Array.isArray(value) ? value.filter((v) => typeof v === "string") : []);

console.log(`\n  Project: ${account.project_id}${dryRun ? "   (dry run — nothing will be written)" : ""}\n`);

const snapshot = await db.collection("users").get();
console.log(`  ${snapshot.size} user document(s)\n`);

const summary = { unchanged: 0, migrated: 0, claims: 0, failed: 0, byRole: {} };
const problems = [];

for (const doc of snapshot.docs) {
  const data = doc.data();
  const student = data.student ?? {};
  const organizer = data.organizer ?? {};

  const role = migrateRole(data.role);
  const name = (data.name ?? data.fullName ?? "").trim();
  const phone = (data.phone ?? "").trim();
  const college = (data.college ?? student.college ?? "").trim();
  const festIds = data.festIds !== undefined ? asStrings(data.festIds) : asStrings(organizer.festIds);

  const next = {
    uid: doc.id,
    id: doc.id,
    role,
    festIds,
    profileCompleted: role === "student" ? Boolean(name && phone && college) : Boolean(name),
    mustChangePassword: data.mustChangePassword === true,
  };
  if (name) next.name = name;
  if (data.avatar ?? data.photoUrl) next.avatar = data.avatar ?? data.photoUrl;
  if (college) next.college = college;
  const department = (data.department ?? student.department ?? "").trim();
  if (department) next.department = department;
  const year = data.year ?? student.year;
  if (typeof year === "number") next.year = year;
  const studentId = (data.studentId ?? student.studentId ?? "").trim();
  if (studentId) next.studentId = studentId;
  const designation = (data.designation ?? organizer.designation ?? "").trim();
  if (designation) next.designation = designation;
  const createdBy = data.createdBy ?? data.invitedBy;
  if (createdBy) next.createdBy = createdBy;

  // Is anything actually different?
  const differs = Object.entries(next).some(([key, value]) => {
    const current = data[key];
    if (Array.isArray(value)) return JSON.stringify(asStrings(current)) !== JSON.stringify(value);
    return current !== value;
  });

  summary.byRole[role] = (summary.byRole[role] ?? 0) + 1;

  if (!name) problems.push(`${doc.id} (${data.email ?? "no email"}) has no name — profile marked incomplete`);

  if (differs) {
    summary.migrated += 1;
    if (!dryRun) {
      await db
        .collection("users")
        .doc(doc.id)
        .set({ ...next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
  } else {
    summary.unchanged += 1;
  }

  // Claims: role + scope, mirrored from the migrated document. A student
  // carries an empty scope so a stale festIds claim cannot linger.
  try {
    const user = await auth.getUser(doc.id);
    const claims = user.customClaims ?? {};
    const wantMustChange = next.mustChangePassword === true;
    const claimsDiffer =
      claims.role !== role ||
      JSON.stringify(asStrings(claims.festIds)) !== JSON.stringify(festIds) ||
      Boolean(claims.mustChangePassword) !== wantMustChange;

    if (claimsDiffer) {
      summary.claims += 1;
      if (!dryRun) {
        await auth.setCustomUserClaims(doc.id, {
          role,
          festIds,
          ...(wantMustChange ? { mustChangePassword: true } : {}),
        });
        // Force a token refresh so the new claim is picked up on the next
        // request rather than within the hour.
        await auth.revokeRefreshTokens(doc.id);
      }
    }
  } catch (error) {
    const code = error?.errorInfo?.code ?? error?.code ?? "";
    if (code === "auth/user-not-found") {
      problems.push(`${doc.id} (${data.email ?? "no email"}) has a profile but no Auth account`);
    } else {
      summary.failed += 1;
      problems.push(`${doc.id}: ${error?.message ?? error}`);
    }
  }
}

// Auth accounts with no profile document cannot sign in past `authenticate()`;
// report them so a super admin can decide.
const orphans = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  for (const user of page.users) {
    if (!snapshot.docs.some((d) => d.id === user.uid)) orphans.push(`${user.uid} (${user.email ?? "no email"})`);
  }
  pageToken = page.pageToken;
} while (pageToken);

console.log(`  documents migrated : ${summary.migrated}`);
console.log(`  already current    : ${summary.unchanged}`);
console.log(`  claims refreshed   : ${summary.claims}`);
console.log(`  failures           : ${summary.failed}`);
console.log(`  roles              : ${Object.entries(summary.byRole).map(([r, n]) => `${r}=${n}`).join("  ")}`);

if (orphans.length) {
  console.log(`\n  Auth accounts with no profile (${orphans.length}) — they cannot use the app until one exists:`);
  for (const o of orphans.slice(0, 20)) console.log(`    ${o}`);
}

if (problems.length) {
  console.log(`\n  Notes (${problems.length}):`);
  for (const p of problems.slice(0, 20)) console.log(`    ${p}`);
}

console.log(dryRun ? "\n  Dry run complete. Re-run without --dry-run to apply.\n" : "\n  Done.\n");
process.exit(summary.failed ? 1 : 0);
