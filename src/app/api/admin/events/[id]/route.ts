import { updateEventSchema } from "@/core/models/event";
import { ApiError, handler, ok, readBody, requireFestAccess, requireRole } from "@/server/api";
import { COLLECTIONS, FieldValue, adminDb } from "@/server/firebase-admin";
import { audit } from "@/server/audit";
import { compact, docToJson } from "@/server/serialize";

/**
 * PATCH /api/admin/events/[id] — edit an event.
 *
 * The guards here are the ones the design's settings screen states out loud:
 * "raising capacity is safe, lowering below 103 is refused", "team size
 * locked once a team registers". Each change that matters to the record
 * (capacity, status, registration window) is written to the audit log with
 * its before and after.
 */
export const PATCH = handler(async (request, context) => {
  const caller = await requireRole(request, "organizer");
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing event id.");

  const input = await readBody(request, updateEventSchema);
  const db = adminDb();
  const ref = db.collection(COLLECTIONS.events).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw ApiError.notFound("That event no longer exists.");

  const current = snap.data()!;
  requireFestAccess(caller, String(current.festId));

  const registered = Number(current.registeredCount ?? 0);

  if (input.capacity !== undefined && input.capacity > 0 && input.capacity < registered) {
    throw ApiError.unprocessable(
      `Capacity can't go below ${registered} — that many seats are already taken. Cancel entries first, or raise it.`,
    );
  }

  const hasEntries = registered > 0;
  const teamSizeChanged =
    input.teamSize !== undefined &&
    (input.teamSize.min !== current.teamSize?.min || input.teamSize.max !== current.teamSize?.max);
  const typeChanged = input.eventType !== undefined && input.eventType !== current.eventType;

  if (hasEntries && (teamSizeChanged || typeChanged)) {
    throw ApiError.unprocessable("Team size and entry type lock once the first team registers.");
  }

  if (input.slug !== undefined && input.slug !== current.slug) {
    const clash = await db
      .collection(COLLECTIONS.events)
      .where("festId", "==", current.festId)
      .where("slug", "==", input.slug)
      .limit(1)
      .get();
    if (!clash.empty) throw ApiError.conflict(`An event at "${input.slug}" already exists in this fest.`);
  }

  // Never let a client write the counter, whatever the body says.
  const { ...changes } = input as Record<string, unknown>;
  delete changes.registeredCount;

  await ref.update(compact({ ...changes, updatedAt: FieldValue.serverTimestamp() }));

  // Audit what matters, with before → after.
  const notes: string[] = [];
  if (input.capacity !== undefined && input.capacity !== current.capacity) {
    notes.push(`Capacity ${current.capacity ?? 0} → ${input.capacity}`);
  }
  if (input.status !== undefined && input.status !== current.status) {
    notes.push(`Status ${current.status} → ${input.status}`);
  }
  if (input.registrationOpen !== undefined && input.registrationOpen !== current.registrationOpen) {
    notes.push(`Registration ${input.registrationOpen ? "opened" : "closed"}`);
  }
  if (input.registrationDeadline !== undefined && input.registrationDeadline !== current.registrationDeadline) {
    notes.push(`Deadline → ${input.registrationDeadline}`);
  }

  await audit(caller, {
    action:
      notes.some((n) => n.startsWith("Capacity")) ? "capacity_changed"
      : notes.some((n) => n.startsWith("Status")) ? "event_status_changed"
      : "event_updated",
    summary: notes.length ? `${current.title}: ${notes.join(" · ")}` : `Edited "${current.title}"`,
    festId: String(current.festId),
    eventId: id,
    subjectType: "event",
    subjectId: id,
    details: { changed: Object.keys(changes) },
  });

  const saved = await ref.get();
  return ok({ event: docToJson(saved) });
});

/**
 * DELETE /api/admin/events/[id]
 *
 * Refused while registrations exist — deleting an event out from under a
 * hundred issued tickets would orphan every one of them. Cancel the event
 * instead; that keeps the record and notifies the holders.
 */
export const DELETE = handler(async (request, context) => {
  const caller = await requireRole(request, "admin");
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing event id.");

  const db = adminDb();
  const ref = db.collection(COLLECTIONS.events).doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw ApiError.notFound("That event no longer exists.");

  const event = snap.data()!;
  requireFestAccess(caller, String(event.festId));

  const entries = await db.collection(COLLECTIONS.registrations).where("eventId", "==", id).limit(1).get();
  if (!entries.empty) {
    throw ApiError.unprocessable(
      "This event has registrations, so it can't be deleted. Cancel it instead — tickets are revoked and holders notified, and the record is kept.",
    );
  }

  const batch = db.batch();
  batch.delete(ref);
  batch.update(db.collection(COLLECTIONS.fests).doc(String(event.festId)), {
    "stats.events": FieldValue.increment(-1),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await audit(caller, {
    action: "event_deleted",
    summary: `Deleted "${event.title}"`,
    festId: String(event.festId),
    eventId: id,
    subjectType: "event",
    subjectId: id,
  });

  return ok({ deleted: true });
});
