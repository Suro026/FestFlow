import { randomUUID } from "node:crypto";
import { computeCertificateEligibility } from "@/core/services/certificate-eligibility";
import { certificateIdFor, generateCertificateNumber, type CertificateDraft, type CertificateType } from "@/core/models/certificate";
import { registrationSchema, type Registration } from "@/core/models/registration";
import { resultSchema, type Result } from "@/core/models/result";
import type { GenerateSummary } from "@/core/repositories/certificate-repository";
import { COLLECTIONS, FieldValue, adminDb, adminStorage } from "../firebase-admin";
import { emailService } from "../email";
import { certificateIssuedEmail } from "../email/templates";
import { compact, randomBytes, toJson } from "../serialize";
import { renderCertificatePdf } from "./pdf";

/**
 * The post-event certificate run for one event.
 *
 *  1. Gather registrations, attendance, the result sheet, and resolve any
 *     teammate emails to accounts.
 *  2. `computeCertificateEligibility` — the pure policy in src/core — decides
 *     who gets what. Nothing here second-guesses it.
 *  3. Issue: one document per person per event, keyed deterministically, so
 *     a re-run after an amended result sheet updates rather than duplicates.
 *  4. Render the PDF, upload it to Storage (or fall back to the on-demand
 *     PDF route when the bucket is unavailable), email it, notify in-app.
 *
 * `dryRun` performs step 1–2 only and returns the counts for the
 * confirmation screen.
 */

export interface IssueOptions {
  eventId: string;
  actorId: string;
  dryRun: boolean;
  appUrl: string;
}

const publicPdfUrl = (appUrl: string, certificateNumber: string) => `${appUrl}/api/verify/${certificateNumber}/pdf`;

export const issueCertificatesForEvent = async (options: IssueOptions): Promise<GenerateSummary & { eventTitle: string }> => {
  const db = adminDb();
  const { eventId, actorId, dryRun, appUrl } = options;

  const eventSnap = await db.collection(COLLECTIONS.events).doc(eventId).get();
  if (!eventSnap.exists) throw new Error("Event not found");
  const event = eventSnap.data()!;

  const festSnap = await db.collection(COLLECTIONS.fests).doc(String(event.festId)).get();
  const fest = festSnap.data() ?? {};

  // Registrations — parsed through the shared schema so the policy sees the
  // same shape the client does.
  const regSnap = await db.collection(COLLECTIONS.registrations).where("eventId", "==", eventId).get();
  const registrations: Registration[] = regSnap.docs
    .map((d) => registrationSchema.safeParse(toJson({ ...d.data(), id: d.id })))
    .filter((r) => r.success)
    .map((r) => r.data!);

  const attSnap = await db.collection(COLLECTIONS.attendance).where("eventId", "==", eventId).get();
  const attendedRegistrationIds = new Set(attSnap.docs.map((d) => d.id));

  const resultSnap = await db.collection(COLLECTIONS.results).doc(eventId).get();
  const result: Result | null = resultSnap.exists
    ? (() => {
        const parsed = resultSchema.safeParse(toJson({ ...resultSnap.data(), id: resultSnap.id }));
        return parsed.success ? parsed.data : null;
      })()
    : null;

  // Resolve teammates entered by email to accounts.
  const emails = [...new Set(registrations.flatMap((r) => r.members.filter((m) => !m.userId).map((m) => m.email.toLowerCase())))];
  const userIdByEmail = new Map<string, string>();
  for (let i = 0; i < emails.length; i += 30) {
    const chunk = emails.slice(i, i + 30);
    if (!chunk.length) break;
    const found = await db.collection(COLLECTIONS.users).where("email", "in", chunk).get();
    for (const d of found.docs) userIdByEmail.set(String(d.data().email).toLowerCase(), d.id);
  }

  const outcome = computeCertificateEligibility({
    event: { id: eventId, title: String(event.title), festId: String(event.festId) },
    fest: { id: String(event.festId), name: String(fest.name ?? "") },
    registrations,
    attendedRegistrationIds,
    result,
    userIdByEmail,
  });

  const base: GenerateSummary & { eventTitle: string } = {
    dryRun,
    eventTitle: String(event.title),
    eligible: outcome.drafts.length,
    created: 0,
    existing: 0,
    emailed: 0,
    skipped: 0,
    failed: 0,
    unmatched: outcome.unmatched.map((u) => ({ name: u.name, email: u.email, type: u.type })),
    byType: outcome.summary.byType,
  };

  if (dryRun) return base;

  const mailer = emailService();
  const year = new Date().getFullYear();
  let bucket: ReturnType<ReturnType<typeof adminStorage>["bucket"]> | null = null;
  try {
    bucket = adminStorage().bucket();
  } catch {
    bucket = null;
  }

  const noteFor = (draft: CertificateDraft): string | undefined => {
    if (!result || draft.type === "participation") return undefined;
    const entry = result.entries.find((e) => e.registrationId === draft.registrationId);
    return entry?.note;
  };

  for (const draft of outcome.drafts) {
    const id = certificateIdFor(draft.eventId, draft.userId);
    const ref = db.collection(COLLECTIONS.certificates).doc(id);
    const existing = await ref.get();

    // Re-runs: keep the number, refresh type/position if the sheet changed.
    const certificateNumber: string = existing.exists ? String(existing.data()!.certificateNumber) : generateCertificateNumber(year, randomBytes);
    const issuedAt: Date = existing.exists && existing.data()!.issuedAt?.toDate ? existing.data()!.issuedAt.toDate() : new Date();
    const typeChanged = existing.exists && existing.data()!.type !== draft.type;

    if (existing.exists && !typeChanged && existing.data()!.revoked !== true) {
      base.existing += 1;
      continue;
    }

    const verifyUrl = `${appUrl}/verify/${certificateNumber}`;
    const note = noteFor(draft);

    let pdf: Uint8Array | null = null;
    try {
      pdf = await renderCertificatePdf({
        recipientName: draft.recipientName,
        type: draft.type as CertificateType,
        eventTitle: draft.eventTitle,
        festName: draft.festName,
        organizationName: String(fest.organizationName ?? ""),
        teamName: draft.teamName,
        position: draft.position,
        issuedOn: issuedAt,
        certificateNumber,
        verifyUrl,
        note,
      });
    } catch (error) {
      console.error("[certificates] render failed", id, error);
    }

    // Storage, when the bucket exists; otherwise the on-demand route serves
    // the same PDF and nothing about the issue is blocked.
    let fileUrl = publicPdfUrl(appUrl, certificateNumber);
    if (pdf && bucket) {
      try {
        const token = randomUUID();
        const path = `certificates/${draft.userId}/${certificateNumber}.pdf`;
        await bucket.file(path).save(Buffer.from(pdf), {
          contentType: "application/pdf",
          metadata: { metadata: { firebaseStorageDownloadTokens: token }, cacheControl: "public, max-age=31536000" },
        });
        fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
      } catch (error) {
        console.warn("[certificates] storage upload skipped:", (error as Error).message);
      }
    }

    await ref.set(
      compact({
        id,
        certificateNumber,
        userId: draft.userId,
        eventId: draft.eventId,
        festId: draft.festId,
        registrationId: draft.registrationId,
        type: draft.type,
        recipientName: draft.recipientName,
        recipientEmail: draft.recipientEmail,
        eventTitle: draft.eventTitle,
        festName: draft.festName,
        teamName: draft.teamName,
        position: draft.position,
        issuedAt: existing.exists ? existing.data()!.issuedAt : FieldValue.serverTimestamp(),
        issuedBy: actorId,
        fileUrl,
        delivery: { status: "pending", attempts: 0 },
        revoked: false,
        createdAt: existing.exists ? existing.data()!.createdAt : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );
    base.created += 1;

    // Email — with the PDF attached when we have it.
    const message = certificateIssuedEmail({
      to: draft.recipientEmail,
      recipientName: draft.recipientName,
      eventTitle: draft.eventTitle,
      festName: draft.festName,
      type: draft.type as CertificateType,
      certificateNumber,
      attachmentFilename: pdf ? `${certificateNumber}.pdf` : undefined,
    });
    if (pdf) message.attachments = [{ filename: `${certificateNumber}.pdf`, content: Buffer.from(pdf), contentType: "application/pdf" }];

    const delivery = await mailer.send(message);
    const status = !mailer.canSend ? "skipped" : delivery.ok ? "sent" : "failed";
    await ref.update(
      compact({
        "delivery.status": status,
        "delivery.attempts": FieldValue.increment(1),
        ...(status === "sent" ? { "delivery.sentAt": FieldValue.serverTimestamp() } : {}),
        ...(status === "failed" && !delivery.ok ? { "delivery.lastError": delivery.error.slice(0, 500) } : {}),
      }),
    );
    if (status === "sent") base.emailed += 1;
    else if (status === "skipped") base.skipped += 1;
    else base.failed += 1;

    await db.collection(COLLECTIONS.notifications).add({
      userId: draft.userId,
      type: "certificate_issued",
      title: "Your certificate is ready",
      body: `${draft.eventTitle} · ${draft.festName}`,
      link: "/certificates",
      festId: draft.festId,
      eventId: draft.eventId,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  if (resultSnap.exists) {
    await resultSnap.ref.update({ certificatesGeneratedAt: FieldValue.serverTimestamp() });
  }

  return base;
};
