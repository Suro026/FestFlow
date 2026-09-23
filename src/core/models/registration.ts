import { z } from "zod";
import {
  auditFieldsSchema,
  emailSchema,
  idSchema,
  phoneSchema,
  shortTextSchema,
} from "./common";
import { answersSchema } from "./registration-fields";
import type { TeamSize } from "./event";

export const REGISTRATION_STATUSES = ["confirmed", "waitlisted", "cancelled"] as const;
export const registrationStatusSchema = z.enum(REGISTRATION_STATUSES);
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;

/**
 * A member of a team entry.
 *
 * Only the person who registers is guaranteed to have an account, so `userId`
 * is optional: teammates are frequently entered by name before they have
 * signed up. When a teammate later registers with the same email, the id is
 * backfilled, which is what lets their certificate reach them.
 */
export const INVITE_STATUSES = ["accepted", "pending", "declined"] as const;
export const inviteStatusSchema = z.enum(INVITE_STATUSES);
export type InviteStatus = z.infer<typeof inviteStatusSchema>;

export const teamMemberSchema = z.object({
  name: shortTextSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  studentId: shortTextSchema.optional(),
  college: shortTextSchema.optional(),
  userId: idSchema.optional(),
  /** The member who created the registration. Exactly one per registration. */
  isLeader: z.boolean().default(false),
  /**
   * Whether the teammate has confirmed they are on this team. The leader is
   * always `accepted`; everyone else starts `pending` and answers from their
   * Teams page. A declined member is removed from the entry, so `declined`
   * is only ever seen in transit. Defaults to `accepted` so entries written
   * before invitations existed remain valid.
   */
  inviteStatus: inviteStatusSchema.default("accepted"),
  invitedAt: z.date().optional(),
  respondedAt: z.date().optional(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

/**
 * The string encoded into the QR code on a digital ticket.
 *
 * It is a random, unguessable token rather than the document id: ticket codes
 * are photographed and shared, and a predictable one would let anyone forge a
 * ticket for an event they never registered for. The scanner looks the code up
 * rather than trusting anything encoded in it.
 */
export const ticketCodeSchema = z
  .string()
  .regex(/^FF-[0-9A-HJ-NP-Z]{10}$/, "Not a valid ticket code");

export const registrationSchema = z
  .object({
    id: idSchema,
    eventId: idSchema,
    festId: idSchema,

    /** The account that created the registration; owns the ticket. */
    userId: idSchema,

    type: z.enum(["solo", "team"]),
    teamName: shortTextSchema.optional(),
    members: z.array(teamMemberSchema).min(1).max(50),
    /**
     * Flat copy of `members[].email`, because Firestore cannot query inside an
     * array of objects and "is this person already on a team" has to be a
     * query, not a scan.
     */
    memberEmails: z.array(emailSchema).default([]),
    /** Seats this entry consumes — the member count at registration time. */
    seats: z.number().int().min(1).default(1),

    ticketCode: ticketCodeSchema,
    status: registrationStatusSchema.default("confirmed"),

    /**
     * Denormalised so the admin registration table and the scanner can render
     * a row without a per-registration lookup of the event and the user.
     * Firestore has no joins; this is the standard trade, and these fields are
     * immutable in practice (an event title change does not retroactively
     * matter on a ticket already issued).
     */
    eventTitle: shortTextSchema,
    userName: shortTextSchema,
    userEmail: emailSchema,

    /**
     * Answers to whatever the fest asks for, keyed by field. The questions
     * live on the fest (`registrationFields`) and can change afterwards, so
     * this is stored as given — a form redesign must not rewrite history, and
     * an export of last year's entries has to still make sense.
     */
    answers: answersSchema.default({}),

    cancelledAt: z.date().optional(),
  })
  .merge(auditFieldsSchema);

export type Registration = z.infer<typeof registrationSchema>;

/** Every email involved in an entry, used to match teammates to accounts. */
export const memberEmails = (registration: Pick<Registration, "members">): string[] =>
  registration.members.map((member) => member.email.toLowerCase());

/**
 * Ticket code alphabet: Crockford base32 without I, L, O and U, so a code read
 * off a phone screen cannot be mistyped into a different valid code.
 */
const TICKET_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generates a ticket code from injected randomness.
 *
 * The random source is a parameter because `crypto` is reached differently on
 * web and in React Native, and `src/core` must not depend on either.
 */
export const generateTicketCode = (randomBytes: (size: number) => Uint8Array): string => {
  const bytes = randomBytes(10);
  let code = "";

  for (let i = 0; i < 10; i += 1) {
    // `noUncheckedIndexedAccess` is on, hence the explicit fallback.
    const byte = bytes[i] ?? 0;
    code += TICKET_ALPHABET[byte % TICKET_ALPHABET.length];
  }

  return `FF-${code}`;
};

const baseCreateRegistration = z.object({
  eventId: idSchema,
  teamName: shortTextSchema.optional(),
  /** Answers to the fest's own questions. Validated against its config. */
  answers: answersSchema.default({}),
  members: z
    .array(teamMemberSchema.omit({ isLeader: true, userId: true, inviteStatus: true, invitedAt: true, respondedAt: true }))
    .min(1)
    .max(50),
});

export type CreateRegistrationInput = z.infer<typeof baseCreateRegistration>;

/**
 * Validates an entry against the event it is for.
 *
 * Team size and duplicate-teammate checks depend on the event, so they cannot
 * live in a static schema. The repository runs this again server-side against
 * the event document rather than trusting whatever the form validated.
 */
export const validateRegistration = (
  // Only the team shape matters here, so the parameter is narrowed to it:
  // callers include the form (which has no answers yet) and the server
  // (which has everything).
  input: { eventId?: string; teamName?: string | undefined; members: readonly { email: string }[] },
  event: { eventType: "solo" | "team"; teamSize: TeamSize },
): { ok: true } | { ok: false; message: string } => {
  const count = input.members.length;

  if (event.eventType === "solo") {
    if (count !== 1) {
      return { ok: false, message: "This is a solo event; register only yourself" };
    }
  } else {
    if (count < event.teamSize.min) {
      return {
        ok: false,
        message: `This event needs at least ${event.teamSize.min} team members`,
      };
    }

    if (count > event.teamSize.max) {
      return {
        ok: false,
        message: `This event allows at most ${event.teamSize.max} team members`,
      };
    }

    if (!input.teamName?.trim()) {
      return { ok: false, message: "Enter a team name" };
    }
  }

  const emails = input.members.map((member) => member.email.trim().toLowerCase());
  const unique = new Set(emails);

  if (unique.size !== emails.length) {
    return { ok: false, message: "The same email appears twice in this team" };
  }

  return { ok: true };
};

export const createRegistrationSchema = baseCreateRegistration;

/* ───────────── team management after registration ───────────── */

export const teamMemberInputSchema = teamMemberSchema.omit({
  isLeader: true,
  userId: true,
  inviteStatus: true,
  invitedAt: true,
  respondedAt: true,
});
export type TeamMemberInput = z.infer<typeof teamMemberInputSchema>;

/**
 * Everything that can happen to a team once it exists.
 *
 * `invite`, `remove` and `rename` are the leader's; `accept` and `decline`
 * belong to the teammate named by email. Each runs as one server transaction
 * against the event so seats never drift from the member list.
 */
export const teamActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("invite"), member: teamMemberInputSchema }),
  z.object({ action: z.literal("remove"), email: emailSchema }),
  z.object({ action: z.literal("rename"), teamName: shortTextSchema }),
  z.object({ action: z.literal("accept") }),
  z.object({ action: z.literal("decline") }),
]);
export type TeamAction = z.infer<typeof teamActionSchema>;

/** The member row for an email, if any. */
export const memberFor = (registration: Pick<Registration, "members">, email: string): TeamMember | undefined =>
  registration.members.find((m) => m.email.toLowerCase() === email.toLowerCase());

/** True when the caller is on the entry but did not create it. */
export const isTeammate = (registration: Pick<Registration, "members" | "userId">, userId: string, email: string): boolean =>
  registration.userId !== userId && memberFor(registration, email) !== undefined;

/** The entry still needs answers or people before the event. */
export const teamShortfall = (
  registration: Pick<Registration, "members">,
  teamSize: TeamSize,
): { pending: number; missing: number } => ({
  pending: registration.members.filter((m) => m.inviteStatus === "pending").length,
  missing: Math.max(0, teamSize.min - registration.members.length),
});

/** A student's own view of an entry, joined with its event, for "My Events". */
export interface RegistrationWithEvent {
  registration: Registration;
  event: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    venue: string;
    posterUrl?: string;
  } | null;
  attended: boolean;
}
