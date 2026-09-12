import { NextResponse } from "next/server";
import { handler, ok } from "@/server/api";
import { COLLECTIONS, adminDb } from "@/server/firebase-admin";
import { toJson } from "@/server/serialize";

/**
 * GET /api/verify/[number] — public certificate lookup.
 *
 * No account needed: this is the page a recruiter lands on from a LinkedIn
 * post. It returns only what is printed on the certificate plus the gate
 * scan that backs it — never the holder's email, phone or college ID.
 * A revoked certificate is reported as revoked, not hidden; hiding it would
 * let the PDF keep circulating unchallenged.
 */
export const GET = handler(async (_request, context) => {
  const { number } = await context.params;
  const certificateNumber = (number ?? "").trim().toUpperCase();

  if (!/^FF-\d{4}-[0-9A-HJ-NP-Z]{8}$/.test(certificateNumber)) {
    return ok({ certificate: null, reason: "malformed" });
  }

  const db = adminDb();
  const snap = await db.collection(COLLECTIONS.certificates).where("certificateNumber", "==", certificateNumber).limit(1).get();
  if (snap.empty) return ok({ certificate: null, reason: "not-found" });

  const doc = snap.docs[0]!;
  const c = doc.data();

  const [attendance, fest] = await Promise.all([
    db.collection(COLLECTIONS.attendance).doc(String(c.registrationId)).get(),
    db.collection(COLLECTIONS.fests).doc(String(c.festId)).get(),
  ]);

  const memberCount = await db
    .collection(COLLECTIONS.registrations)
    .doc(String(c.registrationId))
    .get()
    .then((r) => (Array.isArray(r.data()?.members) ? (r.data()!.members as unknown[]).length : 1))
    .catch(() => 1);

  const response = NextResponse.json({
    certificate: toJson({
      id: doc.id,
      certificateNumber,
      recipientName: c.recipientName,
      type: c.type,
      position: c.position ?? null,
      eventTitle: c.eventTitle,
      festName: c.festName,
      teamName: c.teamName ?? null,
      memberCount,
      issuedAt: c.issuedAt,
      revoked: c.revoked === true,
      revokedAt: c.revokedAt ?? null,
      fileUrl: c.fileUrl ?? null,
      issuer: fest.data()?.organizationName ?? null,
      attendanceVerifiedAt: attendance.exists ? attendance.data()!.scannedAt : null,
      attendanceGate: attendance.exists ? (attendance.data()!.gate ?? null) : null,
    }),
  });
  response.headers.set("Cache-Control", "public, max-age=60, s-maxage=300");
  return response;
});
