import { z } from "zod";
import { auditFieldsSchema, emailSchema, idSchema, shortTextSchema } from "./common";

/**
 * Attendance is its own collection rather than a flag on the registration.
 *
 * A flag cannot answer "who scanned this, and when", cannot be extended to
 * multi-day events, and gives the scanner no way to detect a second scan
 * except by reading a value it also writes. A separate record with a
 * deterministic id makes a duplicate scan a write conflict rather than a
 * silent overwrite.
 */

export const ATTENDANCE_METHODS = ["qr", "manual"] as const;
export const attendanceMethodSchema = z.enum(ATTENDANCE_METHODS);
export type AttendanceMethod = z.infer<typeof attendanceMethodSchema>;

export const attendanceSchema = z
  .object({
    /** Always `${registrationId}` — one attendance record per entry. */
    id: idSchema,
    registrationId: idSchema,
    eventId: idSchema,
    festId: idSchema,
    userId: idSchema,

    /** Denormalised for the scanner's live feed and the attendance report. */
    userName: shortTextSchema,
    userEmail: emailSchema,
    ticketCode: shortTextSchema,
    teamName: shortTextSchema.optional(),

    method: attendanceMethodSchema.default("qr"),
    scannedAt: z.date(),
    /** uid of the organizer who performed the scan. */
    scannedBy: idSchema,
  })
  .merge(auditFieldsSchema);

export type Attendance = z.infer<typeof attendanceSchema>;

/**
 * The deterministic attendance document id for an entry.
 *
 * Because the id is derived rather than generated, a create-if-absent write
 * fails on the second scan instead of overwriting the first. That is what
 * makes the "already scanned" message in the scanner truthful.
 */
export const attendanceIdFor = (registrationId: string): string => registrationId;

/** Meals are tracked per slot so a two-day fest can hand out six meals. */
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof mealTypeSchema>;

export const foodCollectionSchema = z
  .object({
    /** `${registrationId}_${date}_${mealType}`. See `foodCollectionIdFor`. */
    id: idSchema,
    registrationId: idSchema,
    eventId: idSchema,
    festId: idSchema,
    userId: idSchema,

    userName: shortTextSchema,
    ticketCode: shortTextSchema,

    mealType: mealTypeSchema,
    /** `YYYY-MM-DD` of the day the meal belongs to. */
    servedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),

    collectedAt: z.date(),
    collectedBy: idSchema,
  })
  .merge(auditFieldsSchema);

export type FoodCollection = z.infer<typeof foodCollectionSchema>;

/**
 * One meal, per person, per slot, per day. Encoding all three in the id is
 * what stops a participant from collecting lunch twice, and it does so with a
 * write constraint rather than a read-then-check that two scanners could race
 * through simultaneously.
 */
export const foodCollectionIdFor = (
  registrationId: string,
  servedOn: string,
  mealType: MealType,
): string => `${registrationId}_${servedOn}_${mealType}`;

/** What the scanner screens receive after a successful or rejected scan. */
export type ScanOutcome =
  | { result: "ok"; registration: { id: string; userName: string; ticketCode: string; teamName?: string } }
  | { result: "already-recorded"; at: Date; by?: string }
  | { result: "not-found" }
  | { result: "wrong-event"; expectedEventTitle: string }
  | { result: "cancelled" };
