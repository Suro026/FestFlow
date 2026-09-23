import { holdsSeat, teamIsComplete, type RegistrationStatus } from "@/core/models/registration";
import { ApiError, authenticate, handler, ok } from "@/server/api";
import { RATE_LIMITS } from "@/server/rate-limit";
import { COLLECTIONS, FieldValue, adminDb } from "@/server/firebase-admin";
import { announcePromotion } from "@/server/waitlist";

/**
 * POST /api/registrations/[id]/cancel — a student withdraws their own entry.
 *
 * The seats go back to the pool in the same transaction, and if a waitlist
 * exists the earliest waitlisted entry that fits is promoted — which is the
 * only moment promotion can happen without racing the next sign-up.
 */
export const POST = handler(async (request, context) => {
  const caller = await authenticate(request);
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing registration id.");

  const db = adminDb();
  const regRef = db.collection(COLLECTIONS.registrations).doc(id);

  const promoted = await db.runTransaction(async (tx) => {
    const snap = await tx.get(regRef);
    if (!snap.exists) throw ApiError.notFound("That registration no longer exists.");

    const reg = snap.data()!;
    if (reg.userId !== caller.uid) throw ApiError.forbidden("Only the person who registered can cancel.");
    if (reg.status === "cancelled") return null;

    const eventRef = db.collection(COLLECTIONS.events).doc(String(reg.eventId));
    const eventSnap = await tx.get(eventRef);
    const event = eventSnap.data() ?? {};

    // Cancelling after the event has started is not a withdrawal; keep the
    // record honest for the college.
    if (event.status === "ongoing" || event.status === "completed") {
      throw ApiError.unprocessable("This event has already started, so the entry can't be cancelled.");
    }

    // A draft team holds its seats, so cancelling one frees them and can
    // promote from the waitlist exactly as a confirmed entry does.
    const wasConfirmed = holdsSeat((reg.status ?? "confirmed") as RegistrationStatus);
    const seats = Number(reg.seats ?? (Array.isArray(reg.members) ? reg.members.length : 1));

    // Find a waitlisted entry that fits the freed seats, before writing.
    let promote: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    if (wasConfirmed && event.waitlistEnabled === true) {
      // Equality-only query (no index needed); earliest-first in memory.
      const waiting = await tx.get(
        db.collection(COLLECTIONS.registrations).where("eventId", "==", reg.eventId).where("status", "==", "waitlisted"),
      );
      const ordered = [...waiting.docs].sort(
        (a, b) => (a.data().createdAt?.toMillis?.() ?? 0) - (b.data().createdAt?.toMillis?.() ?? 0),
      );
      const capacity = Number(event.capacity ?? 0);
      const after = Number(event.registeredCount ?? 0) - seats;
      promote = ordered.find((d) => capacity === 0 || after + Number(d.data().seats ?? 1) <= capacity) ?? null;
    }

    tx.update(regRef, {
      status: "cancelled",
      cancelledAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (wasConfirmed) {
      let delta = -seats;
      if (promote) {
        // A promoted team that is still short of its minimum becomes a draft,
        // not a confirmed entry — it now holds seats, but it is not a team
        // yet. Solo entries and complete teams go straight to confirmed.
        const promotedData = promote.data();
        const promotedMembers = (promotedData.members ?? []) as { isLeader?: boolean; inviteStatus?: string }[];
        const promotedStatus =
          promotedData.type === "team" && !teamIsComplete(promotedMembers, (event.teamSize ?? { min: 1, max: 1 }) as { min: number })
            ? "draft"
            : "confirmed";
        tx.update(promote.ref, { status: promotedStatus, updatedAt: FieldValue.serverTimestamp() });
        delta += Number(promote.data().seats ?? 1);
      }
      tx.update(eventRef, { registeredCount: FieldValue.increment(delta), updatedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection(COLLECTIONS.fests).doc(String(reg.festId)), { "stats.registrations": FieldValue.increment(delta) });
    }

    return promote ? { id: promote.id, userId: String(promote.data().userId), title: String(reg.eventTitle) } : null;
  });

  if (promoted) await announcePromotion(promoted.id);

  return ok({ cancelled: true, promoted: promoted?.id ?? null });
}, { rateLimit: RATE_LIMITS.authenticated.registration });
