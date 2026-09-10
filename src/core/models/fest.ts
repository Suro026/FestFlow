import { z } from "zod";
import {
  auditFieldsSchema,
  calendarDateSchema,
  idSchema,
  longTextSchema,
  shortTextSchema,
} from "./common";

/**
 * A fest is the top-level container. Events belong to exactly one fest, and
 * an organizer's access is scoped by fest id.
 */

export const FEST_STATUSES = ["draft", "published", "archived"] as const;
export const festStatusSchema = z.enum(FEST_STATUSES);
export type FestStatus = z.infer<typeof festStatusSchema>;

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
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,

    bannerUrl: z.string().url().max(2000).optional(),
    logoUrl: z.string().url().max(2000).optional(),

    /**
     * Only `published` fests appear in the student-facing explorer. Students
     * are blocked from reading drafts by the Firestore rules, not just by the
     * query.
     */
    status: festStatusSchema.default("draft"),

    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),

    createdBy: idSchema,
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
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    bannerUrl: z.string().url().max(2000).optional(),
    logoUrl: z.string().url().max(2000).optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().max(20).optional(),
  })
  .refine((fest) => fest.endDate >= fest.startDate, {
    message: "The end date cannot be before the start date",
    path: ["endDate"],
  });

export type CreateFest = z.infer<typeof createFestSchema>;

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
  startDate: calendarDateSchema.optional(),
  endDate: calendarDateSchema.optional(),
  bannerUrl: z.string().url().max(2000).optional(),
  logoUrl: z.string().url().max(2000).optional(),
  status: festStatusSchema.optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().max(20).optional(),
});

export type UpdateFest = z.infer<typeof updateFestSchema>;
