import { z } from "zod";
import {
  auditFieldsSchema,
  calendarDateSchema,
  clockTimeSchema,
  idSchema,
  longTextSchema,
  shortTextSchema,
} from "./common";

export const EVENT_TYPES = ["solo", "team"] as const;
export const eventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof eventTypeSchema>;

export const EVENT_CATEGORIES = [
  "technical",
  "cultural",
  "sports",
  "workshop",
  "seminar",
  "hackathon",
  "gaming",
  "other",
] as const;
export const eventCategorySchema = z.enum(EVENT_CATEGORIES);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const EVENT_STATUSES = ["draft", "published", "ongoing", "completed", "cancelled"] as const;
export const eventStatusSchema = z.enum(EVENT_STATUSES);
export type EventStatus = z.infer<typeof eventStatusSchema>;

/**
 * Team size bounds. For a solo event both are 1, which lets registration
 * validation treat solo and team events through the same code path instead of
 * branching on `eventType` everywhere.
 */
export const teamSizeSchema = z
  .object({
    min: z.number().int().min(1).max(50),
    max: z.number().int().min(1).max(50),
  })
  .refine((size) => size.max >= size.min, {
    message: "Maximum team size cannot be smaller than the minimum",
    path: ["max"],
  });

export type TeamSize = z.infer<typeof teamSizeSchema>;

export const coordinatorSchema = z.object({
  name: shortTextSchema,
  phone: z.string().trim().max(20).optional(),
  email: z.string().email().optional(),
});

export type Coordinator = z.infer<typeof coordinatorSchema>;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

/**
 * A named meal slot — "Day 1 lunch". Meals are tracked per slot rather than
 * as one boolean, so a two-day fest can hand out six meals and refuse a
 * second helping of any one of them.
 */
export const MEAL_TYPES_LIST = ["breakfast", "lunch", "dinner", "snack"] as const;

export const mealSlotSchema = z.object({
  /** `YYYY-MM-DD` */
  date: calendarDateSchema,
  mealType: z.enum(MEAL_TYPES_LIST),
  label: shortTextSchema,
});

export type MealSlot = z.infer<typeof mealSlotSchema>;

export const eventSchema = z
  .object({
    id: idSchema,
    festId: idSchema,
    /** URL segment under the fest: `/f/{fest}/e/{slug}`. Unique within a fest. */
    slug: slugSchema,

    title: shortTextSchema,
    description: longTextSchema.optional(),
    category: eventCategorySchema.default("other"),

    eventType: eventTypeSchema.default("solo"),
    teamSize: teamSizeSchema.default({ min: 1, max: 1 }),

    date: calendarDateSchema,
    startTime: clockTimeSchema,
    endTime: clockTimeSchema.optional(),
    venue: shortTextSchema,

    /** 0 means unlimited. */
    capacity: z.number().int().min(0).max(100000).default(0),

    /**
     * Maintained by the data layer inside the same transaction that writes a
     * registration, so a capacity check never races against a concurrent
     * sign-up.
     */
    registeredCount: z.number().int().min(0).default(0),

    registrationOpen: z.boolean().default(true),
    registrationDeadline: calendarDateSchema.optional(),
    /** Registrations beyond capacity queue here instead of being refused. */
    waitlistEnabled: z.boolean().default(false),

    /** In rupees. 0 is free entry. */
    entryFee: z.number().int().min(0).max(1000000).default(0),

    posterUrl: z.string().url().max(2000).optional(),
    rules: z.array(z.string().trim().max(500)).max(50).default([]),
    prizes: z.array(z.string().trim().max(200)).max(20).default([]),
    coordinators: z.array(coordinatorSchema).max(10).default([]),

    /** Named entry points the scanner can be posted at. */
    gates: z.array(shortTextSchema).max(20).default([]),
    mealSlots: z.array(mealSlotSchema).max(30).default([]),

    status: eventStatusSchema.default("draft"),

    /**
     * Set once results are published. The certificate pipeline reads this to
     * know an event is finished and eligibility can be computed.
     */
    resultsPublishedAt: z.date().optional(),

    createdBy: idSchema,
  })
  .merge(auditFieldsSchema);

export type Event = z.infer<typeof eventSchema>;

/** True when a student is allowed to register right now. */
export const isRegistrationOpen = (
  event: Pick<
    Event,
    "registrationOpen" | "registrationDeadline" | "capacity" | "registeredCount" | "status"
  >,
  now: Date = new Date(),
): boolean => {
  if (!event.registrationOpen) return false;
  if (event.status !== "published" && event.status !== "ongoing") return false;
  if (event.capacity > 0 && event.registeredCount >= event.capacity) return false;

  if (event.registrationDeadline) {
    // The deadline is a calendar date, so it stays open through that whole day.
    const endOfDeadline = new Date(`${event.registrationDeadline}T23:59:59`);
    if (now > endOfDeadline) return false;
  }

  return true;
};

export const isEventFull = (event: Pick<Event, "capacity" | "registeredCount">): boolean =>
  event.capacity > 0 && event.registeredCount >= event.capacity;

export const seatsRemaining = (
  event: Pick<Event, "capacity" | "registeredCount">,
): number | null => (event.capacity > 0 ? Math.max(0, event.capacity - event.registeredCount) : null);

const eventWritableFields = {
  slug: slugSchema,
  title: shortTextSchema,
  description: longTextSchema.optional(),
  category: eventCategorySchema.default("other"),
  eventType: eventTypeSchema.default("solo"),
  teamSize: teamSizeSchema.default({ min: 1, max: 1 }),
  date: calendarDateSchema,
  startTime: clockTimeSchema,
  endTime: clockTimeSchema.optional(),
  venue: shortTextSchema,
  capacity: z.number().int().min(0).max(100000).default(0),
  registrationOpen: z.boolean().default(true),
  registrationDeadline: calendarDateSchema.optional(),
  waitlistEnabled: z.boolean().default(false),
  entryFee: z.number().int().min(0).max(1000000).default(0),
  posterUrl: z.string().url().max(2000).optional(),
  rules: z.array(z.string().trim().max(500)).max(50).default([]),
  prizes: z.array(z.string().trim().max(200)).max(20).default([]),
  coordinators: z.array(coordinatorSchema).max(10).default([]),
  gates: z.array(shortTextSchema).max(20).default([]),
  mealSlots: z.array(mealSlotSchema).max(30).default([]),
  status: eventStatusSchema.default("draft"),
};

/**
 * A team event must allow more than one member, otherwise the registration
 * form renders a team flow that can only ever accept a single person.
 */
const consistentTeamSize = <T extends { eventType: EventType; teamSize: TeamSize }>(
  value: T,
  ctx: z.RefinementCtx,
) => {
  if (value.eventType === "team" && value.teamSize.max < 2) {
    ctx.addIssue({
      code: "custom",
      message: "A team event needs a maximum team size of at least 2",
      path: ["teamSize", "max"],
    });
  }

  if (value.eventType === "solo" && (value.teamSize.min !== 1 || value.teamSize.max !== 1)) {
    ctx.addIssue({
      code: "custom",
      message: "A solo event must have a team size of exactly 1",
      path: ["teamSize"],
    });
  }
};

export const createEventSchema = z
  .object({ festId: idSchema, ...eventWritableFields })
  .superRefine(consistentTeamSize);

export type CreateEvent = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object(eventWritableFields).partial();

export type UpdateEvent = z.infer<typeof updateEventSchema>;
