import { z } from "zod";
import { auditFieldsSchema, idSchema, shortTextSchema } from "./common";

/**
 * In-app notifications. Email is a separate concern handled by `EmailService`;
 * a notification is the record the student sees inside the app, and it is what
 * the Expo app will subscribe to for push in Phase 2.
 */

export const NOTIFICATION_TYPES = [
  "registration_confirmed",
  "registration_cancelled",
  "event_reminder",
  "event_updated",
  "event_cancelled",
  "attendance_recorded",
  "certificate_issued",
  "results_published",
  "announcement",
] as const;

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

export const notificationSchema = z
  .object({
    id: idSchema,
    /** Recipient. Notifications are always addressed to one account. */
    userId: idSchema,

    type: notificationTypeSchema,
    title: shortTextSchema,
    body: z.string().trim().max(1000),

    /** In-app route to open when tapped, e.g. `/my-certificates`. */
    link: z.string().max(500).optional(),

    /** Ids of what the notification refers to, for deep linking. */
    festId: idSchema.optional(),
    eventId: idSchema.optional(),

    read: z.boolean().default(false),
    readAt: z.date().optional(),
  })
  .merge(auditFieldsSchema);

export type Notification = z.infer<typeof notificationSchema>;

export const createNotificationSchema = z.object({
  userId: idSchema,
  type: notificationTypeSchema,
  title: shortTextSchema,
  body: z.string().trim().max(1000),
  link: z.string().max(500).optional(),
  festId: idSchema.optional(),
  eventId: idSchema.optional(),
});

export type CreateNotification = z.infer<typeof createNotificationSchema>;
