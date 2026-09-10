import { z } from "zod";
import { auditFieldsSchema, emailSchema, idSchema, shortTextSchema } from "./common";
import { AWARD_TYPES } from "./result";

/**
 * Certificate types.
 *
 * `participation` is earned by attending; the rest come from a published
 * result sheet. The list is open-ended by design — adding "best_design" later
 * means adding a member here and a template, nothing else.
 */
export const CERTIFICATE_TYPES = ["participation", ...AWARD_TYPES] as const;
export const certificateTypeSchema = z.enum(CERTIFICATE_TYPES);
export type CertificateType = z.infer<typeof certificateTypeSchema>;

export const CERTIFICATE_LABELS: Record<CertificateType, string> = {
  participation: "Certificate of Participation",
  winner: "Certificate of Excellence — Winner",
  runner_up: "Certificate of Excellence — Runner-up",
  second_runner_up: "Certificate of Excellence — Second Runner-up",
  special_mention: "Certificate of Special Mention",
};

export const DELIVERY_STATUSES = ["pending", "sent", "failed", "skipped"] as const;
export const deliveryStatusSchema = z.enum(DELIVERY_STATUSES);
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>;

export const certificateSchema = z
  .object({
    /** Always `${eventId}_${userId}`. See `certificateIdFor`. */
    id: idSchema,

    /** Human-readable, printed on the certificate and used to verify it. */
    certificateNumber: z
      .string()
      .regex(/^FF-\d{4}-[0-9A-HJ-NP-Z]{8}$/, "Not a valid certificate number"),

    userId: idSchema,
    eventId: idSchema,
    festId: idSchema,
    registrationId: idSchema,

    type: certificateTypeSchema,

    /**
     * Captured at issue time. A student who later corrects the spelling of
     * their name does not retroactively change a certificate that has already
     * been emailed out and possibly printed.
     */
    recipientName: shortTextSchema,
    recipientEmail: emailSchema,
    eventTitle: shortTextSchema,
    festName: shortTextSchema,
    teamName: shortTextSchema.optional(),
    /** Award position, when the certificate came from a result sheet. */
    position: z.number().int().min(1).max(100).optional(),

    issuedAt: z.date(),
    issuedBy: idSchema,

    /** Set once the PDF has been rendered and uploaded to Storage. */
    fileUrl: z.string().url().max(2000).optional(),

    delivery: z
      .object({
        status: deliveryStatusSchema.default("pending"),
        sentAt: z.date().optional(),
        attempts: z.number().int().min(0).default(0),
        lastError: z.string().max(500).optional(),
      })
      .default({ status: "pending", attempts: 0 }),

    /**
     * Revoked certificates stay in the collection so the number can never be
     * reused, but they disappear from the student's list.
     */
    revoked: z.boolean().default(false),
    revokedAt: z.date().optional(),
    revokedReason: z.string().max(500).optional(),
  })
  .merge(auditFieldsSchema);

export type Certificate = z.infer<typeof certificateSchema>;

/**
 * Deterministic id: one certificate per person per event.
 *
 * Re-running the generation for an event therefore updates the existing
 * documents rather than issuing a second copy to everyone — which is the
 * property that makes a re-publish safe.
 */
export const certificateIdFor = (eventId: string, userId: string): string =>
  `${eventId}_${userId}`;

const NUMBER_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export const generateCertificateNumber = (
  year: number,
  randomBytes: (size: number) => Uint8Array,
): string => {
  const bytes = randomBytes(8);
  let suffix = "";

  for (let i = 0; i < 8; i += 1) {
    const byte = bytes[i] ?? 0;
    suffix += NUMBER_ALPHABET[byte % NUMBER_ALPHABET.length];
  }

  return `FF-${year}-${suffix}`;
};

/**
 * What the eligibility pass produces, before ids and numbers are assigned.
 * Deliberately free of any generated field so it can be computed, previewed in
 * the dashboard, and only then written.
 */
export interface CertificateDraft {
  userId: string;
  eventId: string;
  festId: string;
  registrationId: string;
  type: CertificateType;
  recipientName: string;
  recipientEmail: string;
  eventTitle: string;
  festName: string;
  teamName?: string;
  position?: number;
}

/** A certificate joined with what the "My Certificates" page needs to render. */
export interface CertificateListItem {
  certificate: Certificate;
  downloadable: boolean;
}
