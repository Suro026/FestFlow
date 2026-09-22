import { z } from "zod";
import { idSchema, shortTextSchema } from "./common";

/**
 * The audit trail behind every privileged action.
 *
 * Written only by the server, read by anyone who manages the fest. Exports
 * carry the same log for the institutional record — "who overrode what,
 * when" is the question a college asks after a disputed entry, and the
 * design surfaces the latest entries on the registrations and console pages.
 */

export const AUDIT_ACTIONS = [
  "manual_entry",
  "attendance_removed",
  "waitlist_promoted",
  "registration_cancelled_by_staff",
  "capacity_changed",
  "event_created",
  "event_updated",
  "event_status_changed",
  "event_deleted",
  "fest_created",
  "fest_updated",
  "fest_status_changed",
  "fest_deleted",
  "staff_created",
  "staff_updated",
  "staff_deleted",
  "results_saved",
  "results_published",
  "announcement_sent",
  "file_uploaded",
  "password_changed",
  "results_unpublished",
  "certificates_generated",
  "certificate_revoked",
  "shift_created",
  "shift_updated",
  "shift_deleted",
] as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export type AuditAction = z.infer<typeof auditActionSchema>;

export const auditEntrySchema = z.object({
  id: idSchema,
  festId: idSchema.optional(),
  eventId: idSchema.optional(),

  action: auditActionSchema,
  /** One line, already phrased for a person: "Capacity 100 → 120". */
  summary: shortTextSchema,
  /** Anything structured worth keeping: before/after values, ids. */
  details: z.record(z.string(), z.unknown()).optional(),

  actorId: idSchema,
  actorName: shortTextSchema,
  actorRole: z.enum(["student", "volunteer", "admin", "super_admin"]),

  /** Reference the entry is about, for filtering a row's history. */
  subjectType: z.enum(["registration", "event", "fest", "user", "result", "certificate", "shift"]).optional(),
  subjectId: idSchema.optional(),

  createdAt: z.coerce.date(),
});

export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  manual_entry: "Manual entry",
  attendance_removed: "Check-in removed",
  waitlist_promoted: "Promoted from waitlist",
  registration_cancelled_by_staff: "Registration cancelled",
  capacity_changed: "Capacity changed",
  event_created: "Event created",
  event_updated: "Event updated",
  event_status_changed: "Event status changed",
  event_deleted: "Event deleted",
  fest_created: "Fest created",
  fest_updated: "Fest updated",
  fest_status_changed: "Fest status changed",
  fest_deleted: "Fest deleted",
  staff_created: "Staff account created",
  staff_updated: "Staff account updated",
  staff_deleted: "Staff account deleted",
  results_saved: "Results saved",
  results_published: "Results published",
  announcement_sent: "Announcement sent",
  file_uploaded: "File uploaded",
  password_changed: "Password changed",
  results_unpublished: "Results unpublished",
  certificates_generated: "Certificates generated",
  certificate_revoked: "Certificate revoked",
  shift_created: "Shift created",
  shift_updated: "Shift updated",
  shift_deleted: "Shift deleted",
};
