import { z } from "zod";
import { ApiError, handler, ok, readBody, requireFestAccess, requirePermission } from "@/server/api";
import { RATE_LIMITS } from "@/server/rate-limit";
import { COLLECTIONS, adminDb } from "@/server/firebase-admin";
import { audit } from "@/server/audit";
import { issueCertificatesForEvent } from "@/server/certificates/issue";

const bodySchema = z.object({ dryRun: z.boolean().default(false) });

/**
 * POST /api/admin/events/[id]/certificates — the post-event run.
 *
 * Refused until the event is marked completed: a certificate that says
 * "participated" for an event still in progress is a false statement, and
 * once issued it is emailed and cannot be un-sent.
 */
export const POST = handler(async (request, context) => {
  const caller = await requirePermission(request, "certificate:issue");
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing event id.");
  const { dryRun } = await readBody(request, bodySchema);

  const db = adminDb();
  const eventSnap = await db.collection(COLLECTIONS.events).doc(id).get();
  if (!eventSnap.exists) throw ApiError.notFound("That event no longer exists.");
  const event = eventSnap.data()!;
  requireFestAccess(caller, String(event.festId));

  if (event.status !== "completed") {
    throw ApiError.unprocessable("Mark the event completed first — certificates state that the event has ended.");
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const summary = await issueCertificatesForEvent({ eventId: id, actorId: caller.uid, dryRun, appUrl });

  if (!dryRun) {
    await audit(caller, {
      action: "certificates_generated",
      summary: `Generated certificates for "${event.title}" · ${summary.created} issued, ${summary.existing} already held one · ${summary.emailed} emailed, ${summary.skipped} awaiting an email provider, ${summary.failed} failed`,
      festId: String(event.festId),
      eventId: id,
      subjectType: "event",
      subjectId: id,
      details: { ...summary, unmatched: summary.unmatched.length },
    });
  }

  return ok(summary);
}, { rateLimit: RATE_LIMITS.authenticated.certificates });
