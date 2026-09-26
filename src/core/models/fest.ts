import { z } from "zod";
import {
  auditFieldsSchema,
  calendarDateSchema,
  idSchema,
  longTextSchema,
  shortTextSchema, httpsUrlSchema } from "./common";
import { registrationFieldsSchema } from "./registration-fields";

/**
 * A fest is the top-level container. Events belong to exactly one fest, and
 * an organizer's access is scoped by fest id.
 */

export const FEST_STATUSES = ["draft", "published", "archived"] as const;
export const festStatusSchema = z.enum(FEST_STATUSES);
export type FestStatus = z.infer<typeof festStatusSchema>;

/** What kind of fest this is. Drives the explorer filter and the default artwork. */
export const FEST_TYPES = ["tech", "cultural", "sports", "hackathon", "conference", "other"] as const;
export const festTypeSchema = z.enum(FEST_TYPES);
export type FestType = z.infer<typeof festTypeSchema>;

export const FEST_TYPE_LABELS: Record<FestType, string> = {
  tech: "Tech fest",
  cultural: "Cultural fest",
  sports: "Sports fest",
  hackathon: "Hackathon",
  conference: "Conference",
  other: "Other",
};

/**
 * Who can find the fest, as distinct from whether it is published.
 *
 *   public   — listed in the explorer and indexed
 *   unlisted — reachable at its address, never listed (a soft launch)
 *   private  — staff only, whatever the status says
 */
export const FEST_VISIBILITIES = ["public", "unlisted", "private"] as const;
export const festVisibilitySchema = z.enum(FEST_VISIBILITIES);
export type FestVisibility = z.infer<typeof festVisibilitySchema>;

/**
 * The fest-wide registration switch. Individual events keep their own
 * `registrationOpen`; this one closes all of them at once, which is what a
 * fest needs on the morning it starts.
 */
export const FEST_REGISTRATION_STATES = ["open", "closed", "upcoming"] as const;
export const festRegistrationStateSchema = z.enum(FEST_REGISTRATION_STATES);
export type FestRegistrationState = z.infer<typeof festRegistrationStateSchema>;

/** #rrggbb, used for the fest's accent on its public page. */
export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex colour like #9184d9");

/** "2025-26". Free enough for institutions that write it differently. */
export const academicYearSchema = z
  .string()
  .trim()
  .max(12)
  .regex(/^[0-9]{4}(-[0-9]{2,4})?$/, "Use a year like 2025-26");

export const festSchema = z
  .object({
    id: idSchema,
    name: shortTextSchema,
    /** URL-safe identifier used for public fest pages. Unique across fests. */
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
    tagline: shortTextSchema.optional(),
    description: longTextSchema.optional(),

    organizationName: shortTextSchema,
    venue: shortTextSchema,
    /** City the fest is held in — the explorer's primary filter. */
    city: shortTextSchema,
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,

    /** What kind of fest. Older documents predate the field. */
    festType: festTypeSchema.default("other"),
    academicYear: academicYearSchema.optional(),
    themeColor: hexColorSchema.optional(),

    bannerUrl: httpsUrlSchema.optional(),
    logoUrl: httpsUrlSchema.optional(),
    /** The tall artwork at the top of the public fest page. */
    heroUrl: httpsUrlSchema.optional(),
    /** Square-ish card art for the explorer grid. */
    thumbnailUrl: httpsUrlSchema.optional(),
    /** 1200x630 for link previews. Falls back to the banner. */
    socialImageUrl: httpsUrlSchema.optional(),

    visibility: festVisibilitySchema.default("public"),
    registrationState: festRegistrationStateSchema.default("open"),

    /**
     * What this fest asks its students for. Absent on fests created before
     * the field existed, which `visibleFields` reads as the default set.
     */
    registrationFields: registrationFieldsSchema.optional(),

    /**
     * Only `published` fests appear in the student-facing explorer. Students
     * are blocked from reading drafts by the Firestore rules, not just by the
     * query.
     */
    status: festStatusSchema.default("draft"),

    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),

    /**
     * Public counters, maintained by the code paths that change them (event
     * creation, the registration transaction, check-in). Registrations are
     * not publicly listable - a student's entry is theirs - so the marquee's
     * "6,412 registered" has to come from here rather than from a count.
     */
    stats: z
      .object({
        events: z.number().int().min(0).default(0),
        registrations: z.number().int().min(0).default(0),
        checkIns: z.number().int().min(0).default(0),
      })
      .default({ events: 0, registrations: 0, checkIns: 0 }),

    createdBy: idSchema,
    /**
     * The admin accountable for the fest. Distinct from `createdBy`, which is
     * historical and never changes; ownership transfers.
     */
    ownerId: idSchema.optional(),
    archivedAt: z.coerce.date().optional(),
  })
  .merge(auditFieldsSchema)
  .refine((fest) => fest.endDate >= fest.startDate, {
    message: "The end date cannot be before the start date",
    path: ["endDate"],
  });

export type Fest = z.infer<typeof festSchema>;

/** Fields accepted when creating a fest. Server fills in the rest. */
export const createFestSchema = z
  .object({
    name: shortTextSchema,
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens"),
    tagline: shortTextSchema.optional(),
    description: longTextSchema.optional(),
    organizationName: shortTextSchema,
    venue: shortTextSchema,
    city: shortTextSchema,
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    festType: festTypeSchema.default("other"),
    academicYear: academicYearSchema.optional(),
    themeColor: hexColorSchema.optional(),
    bannerUrl: httpsUrlSchema.optional(),
    logoUrl: httpsUrlSchema.optional(),
    heroUrl: httpsUrlSchema.optional(),
    thumbnailUrl: httpsUrlSchema.optional(),
    socialImageUrl: httpsUrlSchema.optional(),
    visibility: festVisibilitySchema.default("public"),
    registrationState: festRegistrationStateSchema.default("open"),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
  })
  .refine((fest) => fest.endDate >= fest.startDate, {
    message: "The end date cannot be before the start date",
    path: ["endDate"],
  });

export type CreateFest = z.infer<typeof createFestSchema>;

/**
 * Public self-service event registration — `POST /api/register-event`.
 *
 * Deliberately a smaller surface than `createFestSchema`: a first-time Event
 * Head is asked for what they actually know at the moment of registering,
 * not the full fest-settings form. `organizationName`/`venue`/`city` are
 * filled with placeholders server-side and are the Event Head's to edit from
 * fest settings afterwards, same as any other admin would.
 */
export const registerEventSchema = z.object({
  name: shortTextSchema,
  description: longTextSchema.optional(),
  festType: festTypeSchema,
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
}).refine((fest) => fest.endDate >= fest.startDate, {
  message: "The end date cannot be before the start date",
  path: ["endDate"],
});

export type RegisterEvent = z.infer<typeof registerEventSchema>;

/**
 * Partial update. `slug` is intentionally absent: changing it would break
 * every link already shared for the fest.
 */
export const updateFestSchema = z.object({
  name: shortTextSchema.optional(),
  tagline: shortTextSchema.optional(),
  description: longTextSchema.optional(),
  organizationName: shortTextSchema.optional(),
  venue: shortTextSchema.optional(),
  city: shortTextSchema.optional(),
  startDate: calendarDateSchema.optional(),
  endDate: calendarDateSchema.optional(),
  festType: festTypeSchema.optional(),
  academicYear: academicYearSchema.optional(),
  themeColor: hexColorSchema.optional(),
  bannerUrl: httpsUrlSchema.optional(),
  logoUrl: httpsUrlSchema.optional(),
  heroUrl: httpsUrlSchema.optional(),
  thumbnailUrl: httpsUrlSchema.optional(),
  socialImageUrl: httpsUrlSchema.optional(),
  visibility: festVisibilitySchema.optional(),
  registrationState: festRegistrationStateSchema.optional(),
  status: festStatusSchema.optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
});

export type UpdateFest = z.infer<typeof updateFestSchema>;

/**
 * Is the fest taking registrations at all?
 *
 * An event can be open while its fest is not; the stricter of the two wins,
 * which is what makes the fest-wide switch worth having.
 */
export const festAcceptsRegistrations = (fest: Pick<Fest, "status" | "registrationState">): boolean =>
  fest.status === "published" && (fest.registrationState ?? "open") === "open";

/** Should this fest appear in the public explorer? */
export const festIsListed = (fest: Pick<Fest, "status" | "visibility">): boolean =>
  fest.status === "published" && (fest.visibility ?? "public") === "public";
