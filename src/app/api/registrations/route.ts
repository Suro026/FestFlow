import {
  createRegistrationSchema,
  generateTicketCode,
  validateRegistration,
} from "@/core/models/registration";
import { isRegistrationOpen } from "@/core/models/event";
import { ApiError, authenticate, handler, ok, readBody } from "@/server/api";
import { COLLECTIONS, FieldValue, Timestamp, adminDb } from "@/server/firebase-admin";
import { compact, docToJson, randomBytes } from "@/server/serialize";
import { emailService } from "@/server/email";
import { registrationConfirmedEmail, teamInviteEmail } from "@/server/email/templates";
import { notify, notifyMany } from "@/server/notify";

/**
 * POST /api/registrations — register for an event.
 *
 * Everything that decides whether a seat is granted happens inside one
 * Firestore transaction: the event is re-read, the window and capacity are
 * re-checked, the duplicate check runs, and the registration and the seat
 * counter are written together. Two students submitting for the last seat in
 * the same instant therefore get one success and one honest "full", never two
 * tickets. A team consumes seats equal to its member count.
 */
export const POST = handler(async (request) => {
  const caller = await authenticate(request);

  if (!caller.emailVerified) {
    throw ApiError.forbidden("Verify your email before registering — your ticket and certificate are sent to it.");
  }

  const input = await readBody(request, createRegistrationSchema);
  const db = adminDb();

  const eventRef = db.collection(COLLECTIONS.events).doc(input.eventId);
  const userSnap = await db.collection(COLLECTIONS.users).doc(caller.uid).get();
  const profile = userSnap.data() ?? {};

  // The leader is always the caller. Whatever the form sent for row 0 is
  // replaced with the verified identity, so nobody registers "as" someone else.
  const leaderName = String(profile.fullName ?? input.members[0]?.name ?? "").trim();
  if (!leaderName) throw ApiError.unprocessable("Add your name to your profile before registering.");

  // Resolve teammates who already have accounts, so their certificates can
  // reach them. Done before the transaction: it is a read that can be stale
  // without consequence.
  const teammateEmails = input.members.slice(1).map((m) => m.email.toLowerCase());
  const userIdByEmail = new Map<string, string>();

  for (let i = 0; i < teammateEmails.length; i += 30) {
    const chunk = teammateEmails.slice(i, i + 30);
    if (!chunk.length) break;
    const found = await db.collection(COLLECTIONS.users).where("email", "in", chunk).get();
    for (const d of found.docs) userIdByEmail.set(String(d.data().email), d.id);
  }

  const result = await db.runTransaction(async (tx) => {
    const eventSnap = await tx.get(eventRef);
    if (!eventSnap.exists) throw ApiError.notFound("That event no longer exists.");

    const event = eventSnap.data()!;
    const teamSize = event.teamSize ?? { min: 1, max: 1 };

    const check = validateRegistration(input, { eventType: event.eventType ?? "solo", teamSize });
    if (!check.ok) throw ApiError.unprocessable(check.message);

    const seats = input.members.length;
    const capacity = Number(event.capacity ?? 0);
    const registered = Number(event.registeredCount ?? 0);

    const openNow = isRegistrationOpen({
      registrationOpen: event.registrationOpen !== false,
      registrationDeadline: event.registrationDeadline,
      capacity,
      registeredCount: registered,
      status: event.status ?? "draft",
    });

    const wouldOverflow = capacity > 0 && registered + seats > capacity;
    const waitlist = wouldOverflow && event.waitlistEnabled === true;

    if (!openNow && !waitlist) {
      throw ApiError.unprocessable(
        capacity > 0 && registered >= capacity ? "This event is full." : "Registration for this event is closed.",
      );
    }
    if (wouldOverflow && !waitlist) {
      const left = Math.max(0, capacity - registered);
      throw ApiError.unprocessable(
        left === 0 ? "This event is full." : `Only ${left} ${left === 1 ? "seat" : "seats"} left — reduce the team size.`,
      );
    }

    // One active entry per person per event.
    const dup = await tx.get(
      db
        .collection(COLLECTIONS.registrations)
        .where("eventId", "==", input.eventId)
        .where("userId", "==", caller.uid)
        .where("status", "in", ["confirmed", "waitlisted"])
        .limit(1),
    );
    if (!dup.empty) throw ApiError.conflict("You already hold an entry for this event.");

    // Teammates cannot be in two entries either. Firestore allows only one of
    // `in` / `array-contains-any` per query, so status is checked in memory.
    if (teammateEmails.length) {
      const clash = await tx.get(
        db
          .collection(COLLECTIONS.registrations)
          .where("eventId", "==", input.eventId)
          .where("memberEmails", "array-contains-any", teammateEmails.slice(0, 30)),
      );
      const active = clash.docs.find((d) => d.data().status !== "cancelled");
      if (active) {
        const taken = (active.data().memberEmails as string[]).find((e) => teammateEmails.includes(e));
        throw ApiError.conflict(`${taken} is already on another team for this event.`);
      }
    }

    const ticketCode = generateTicketCode(randomBytes);
    const regRef = db.collection(COLLECTIONS.registrations).doc();

    // Teammates start as invited: they confirm from their Teams page, and a
    // declined invitation hands the seat back.
    const invitedAt = Timestamp.now();
    const members = input.members.map((m, i) => {
      const email = i === 0 ? caller.email : m.email.toLowerCase();
      return compact({
        name: i === 0 ? leaderName : m.name.trim(),
        email,
        phone: i === 0 ? profile.phone : m.phone,
        studentId: i === 0 ? profile.student?.studentId : m.studentId,
        college: i === 0 ? profile.student?.college : m.college,
        userId: i === 0 ? caller.uid : userIdByEmail.get(email),
        isLeader: i === 0,
        inviteStatus: i === 0 ? "accepted" : "pending",
        invitedAt: i === 0 ? undefined : invitedAt,
      });
    });

    const status = waitlist ? "waitlisted" : "confirmed";

    tx.set(
      regRef,
      compact({
        id: regRef.id,
        eventId: input.eventId,
        festId: event.festId,
        userId: caller.uid,
        type: event.eventType === "team" ? "team" : "solo",
        teamName: input.teamName?.trim() || undefined,
        members,
        // Flat copy for the "already on a team" query above; Firestore cannot
        // query inside an array of objects.
        memberEmails: members.map((m) => m.email),
        seats,
        ticketCode,
        status,
        eventTitle: event.title,
        userName: leaderName,
        userEmail: caller.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );

    if (status === "confirmed") {
      tx.update(eventRef, { registeredCount: FieldValue.increment(seats), updatedAt: FieldValue.serverTimestamp() });
      tx.update(db.collection(COLLECTIONS.fests).doc(String(event.festId)), {
        "stats.registrations": FieldValue.increment(seats),
      });
    }

    return { regRef, status, event };
  });

  const saved = await result.regRef.get();
  const registration = docToJson(saved)!;

  // Side effects after the transaction — none of these should be able to
  // roll back a seat that was correctly granted.
  const festSnap = await db.collection(COLLECTIONS.fests).doc(String(result.event.festId)).get();
  const festName = String(festSnap.data()?.name ?? "");

  const meta = { userId: caller.uid, festId: String(result.event.festId), eventId: input.eventId, subjectType: "registration", subjectId: saved.id };

  await notify({
    userId: caller.uid,
    type: "registration_confirmed",
    title: result.status === "waitlisted" ? "You're on the waitlist" : "You're in",
    body: `${result.event.title} · ${festName}`,
    link: `/registered/${saved.id}`,
    festId: String(result.event.festId),
    eventId: input.eventId,
  });

  if (result.status === "confirmed") {
    await emailService().send(
      registrationConfirmedEmail({
        to: caller.email,
        recipientName: leaderName,
        eventTitle: String(result.event.title),
        festName,
        date: String(result.event.date),
        startTime: String(result.event.startTime),
        venue: String(result.event.venue),
        ticketCode: String(registration.ticketCode),
        registrationId: saved.id,
        ...(input.teamName ? { teamName: input.teamName } : {}),
        meta,
      }),
    );
  }

  // Invitations to teammates: an in-app notification where an account
  // exists, and an email either way.
  const teammates = (registration.members as Array<{ name: string; email: string; userId?: string; isLeader?: boolean }>).filter(
    (m) => !m.isLeader,
  );
  if (teammates.length && input.teamName) {
    const teamName = input.teamName;
    await notifyMany(
      teammates
        .filter((m) => m.userId)
        .map((m) => ({
          userId: m.userId!,
          type: "team_invite" as const,
          title: `${leaderName} added you to ${teamName}`,
          body: `${result.event.title} · ${festName}`,
          link: "/teams",
          festId: String(result.event.festId),
          eventId: input.eventId,
        })),
    );
    await emailService().sendMany(
      teammates.map((m) =>
        teamInviteEmail({
          to: m.email,
          recipientName: m.name,
          leaderName,
          teamName,
          eventTitle: String(result.event.title),
          festName,
          date: String(result.event.date),
          meta: { ...meta, userId: m.userId ?? undefined },
        }),
      ),
    );
  }

  return ok({ registration }, 201);
});
