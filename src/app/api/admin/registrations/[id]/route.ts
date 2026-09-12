import { z } from "zod";
import { ApiError, handler, ok, readBody, requireFestAccess, requireRole } from "@/server/api";
import { COLLECTIONS, FieldValue, adminDb } from "@/server/firebase-admin";
import { audit } from "@/server/audit";

const actionSchema = z.object({
  action: z.enum(["promote", "cancel"]),
  reason: z.string().trim().max(500).optional(),
});

/**
 * POST /api/admin/registrations/[id] — staff actions on one entry.
 *
 *  promote  waitlisted → confirmed, if the seats fit; bumps the counters
 *  cancel   confirmed/waitlisted → cancelled, releases seats, promotes the
 *           next waitlisted entry that fits
 *
 * Both run as transactions against the event so a promotion can never
 * overbook, and both are audited under the acting admin's name.
 */
export const POST = handler(async (request, context) => {
  const caller = await requireRole(request, "admin");
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing registration id.");

  const { action, reason } = await readBody(request, actionSchema);
  const db = adminDb();
  const regRef = db.collection(COLLECTIONS.registrations).doc(id);

  const first = await regRef.get();
  if (!first.exists) throw ApiError.notFound("That registration no longer exists.");
  requireFestAccess(caller, String(first.data()!.festId));

  const outcome = await db.runTransaction(async (tx) => {
    const regSnap = await tx.get(regRef);
    const reg = regSnap.data()!;
    const eventRef = db.collection(COLLECTIONS.events).doc(String(reg.eventId));
    const eventSnap = await tx.get(eventRef);
    const event = eventSnap.data() ?? {};
    const capacity = Number(event.capacity ?? 0);
    const registered = Number(event.registeredCount ?? 0);
    const seats = Number(reg.seats ?? (Array.isArray(reg.members) ? reg.members.length : 1));
    const festRef = db.collection(COLLECTIONS.fests).doc(String(reg.festId));

    if (action === "promote") {
      if (reg.status !== "waitlisted") throw ApiError.unprocessable("Only a waitlisted entry can be promoted.");
      if (capacity > 0 && registered + seats > capacity) {
        throw ApiError.unprocessable(
          `Only ${Math.max(0, capacity - registered)} seat(s) free and this entry needs ${seats}. Raise capacity first.`,
        );
      }
      tx.update(regRef, { status: "confirmed", updatedAt: FieldValue.serverTimestamp() });
      tx.update(eventRef, { registeredCount: FieldValue.increment(seats), updatedAt: FieldValue.serverTimestamp() });
      tx.update(festRef, { "stats.registrations": FieldValue.increment(seats) });
      return { kind: "promoted" as const, reg, seats };
    }

    // cancel
    if (reg.status === "cancelled") return { kind: "noop" as const, reg, seats };
    const wasConfirmed = reg.status === "confirmed";

    let promote: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    if (wasConfirmed && event.waitlistEnabled === true) {
      const waiting = await tx.get(
        db.collection(COLLECTIONS.registrations).where("eventId", "==", reg.eventId).where("status", "==", "waitlisted"),
      );
      const ordered = [...waiting.docs].sort(
        (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0),
      );
      const after = registered - seats;
      promote = ordered.find((d) => capacity === 0 || after + Number(d.data().seats ?? 1) <= capacity) ?? null;
    }

    tx.update(regRef, { status: "cancelled", cancelledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    if (wasConfirmed) {
      let delta = -seats;
      if (promote) {
        tx.update(promote.ref, { status: "confirmed", updatedAt: FieldValue.serverTimestamp() });
        delta += Number(promote.data().seats ?? 1);
      }
      tx.update(eventRef, { registeredCount: FieldValue.increment(delta), updatedAt: FieldValue.serverTimestamp() });
      tx.update(festRef, { "stats.registrations": FieldValue.increment(delta) });
    }
    return { kind: "cancelled" as const, reg, seats, promoted: promote ? { id: promote.id, userId: String(promote.data().userId) } : null };
  });

  if (outcome.kind === "promoted") {
    await audit(caller, {
      action: "waitlist_promoted",
      summary: `Promoted ${outcome.reg.teamName ?? outcome.reg.userName} from waitlist · ${outcome.reg.ticketCode}`,
      festId: String(outcome.reg.festId),
      eventId: String(outcome.reg.eventId),
      subjectType: "registration",
      subjectId: id,
    });
    await db.collection(COLLECTIONS.notifications).add({
      userId: outcome.reg.userId,
      type: "registration_confirmed",
      title: "A seat opened up — you're in",
      body: String(outcome.reg.eventTitle),
      link: `/registered/${id}`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);
  }

  if (outcome.kind === "cancelled") {
    await audit(caller, {
      action: "registration_cancelled_by_staff",
      summary: `Cancelled ${outcome.reg.teamName ?? outcome.reg.userName} · ${outcome.reg.ticketCode}${reason ? ` — ${reason}` : ""}`,
      festId: String(outcome.reg.festId),
      eventId: String(outcome.reg.eventId),
      subjectType: "registration",
      subjectId: id,
      details: { reason },
    });
    await db.collection(COLLECTIONS.notifications).add({
      userId: outcome.reg.userId,
      type: "registration_cancelled",
      title: "Your registration was cancelled by the organizers",
      body: `${outcome.reg.eventTitle}${reason ? ` — ${reason}` : ""}`,
      link: "/my-events",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);
  }

  return ok({ result: outcome.kind });
});
