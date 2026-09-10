import { z } from "zod";
import {
  auditFieldsSchema,
  emailSchema,
  idSchema,
  phoneSchema,
  shortTextSchema,
} from "./common";
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
export const teamMemberSchema = z.object({
  name: shortTextSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  studentId: shortTextSchema.optional(),
  college: shortTextSchema.optional(),
  userId: idSchema.optional(),
  /** The member who created the registration. Exactly one per registration. */
  isLeader: z.boolean().default(false),
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
  members: z.array(teamMemberSchema.omit({ isLeader: true })).min(1).max(50),
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
  input: CreateRegistrationInput,
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
