import { z } from "zod";
import {
  auditFieldsSchema,
  emailSchema,
  idSchema,
  phoneSchema,
  shortTextSchema,
} from "./common";

/**
 * Roles are ordered least- to most-privileged. `roleRank` below turns that
 * into a comparison, so a check is written once as `hasAtLeast(role, "admin")`
 * rather than as a growing list of equality tests.
 */
export const USER_ROLES = ["student", "organizer", "admin", "super_admin"] as const;

export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

const ROLE_RANK: Record<UserRole, number> = {
  student: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3,
};

export const roleRank = (role: UserRole): number => ROLE_RANK[role];

export const hasAtLeast = (role: UserRole | undefined, required: UserRole): boolean =>
  role !== undefined && ROLE_RANK[role] >= ROLE_RANK[required];

/**
 * Fields a student fills in about themselves. Kept separate from the account
 * fields because organizers do not have them, and because the registration
 * form validates exactly this shape.
 */
export const studentProfileSchema = z.object({
  studentId: shortTextSchema,
  college: shortTextSchema,
  department: shortTextSchema.optional(),
  /** Year of study, 1-6 to cover integrated and postgraduate courses. */
  year: z.number().int().min(1).max(6).optional(),
});

export type StudentProfile = z.infer<typeof studentProfileSchema>;

export const organizerProfileSchema = z.object({
  designation: shortTextSchema.optional(),
  /**
   * Fests this organizer administers. An `admin` is scoped to these; a
   * `super_admin` implicitly has access to all of them.
   */
  festIds: z.array(idSchema).default([]),
});

export type OrganizerProfile = z.infer<typeof organizerProfileSchema>;

export const userSchema = z
  .object({
    /** Document id, always equal to the Firebase Auth uid. */
    id: idSchema,
    email: emailSchema,
    fullName: shortTextSchema,
    phone: phoneSchema.optional(),
    photoUrl: z.string().url().max(2000).optional(),

    /**
     * Mirrors the `role` custom claim on the user's Auth token.
     *
     * The claim is what Firestore rules and the API routes actually trust.
     * This copy exists so the admin screens can list and filter users without
     * a round trip to the Auth API, and it is only ever written by the server.
     */
    role: userRoleSchema,

    emailVerified: z.boolean().default(false),
    /** Set by a super admin to revoke access without deleting history. */
    disabled: z.boolean().default(false),

    student: studentProfileSchema.optional(),
    organizer: organizerProfileSchema.optional(),
  })
  .merge(auditFieldsSchema);

export type User = z.infer<typeof userSchema>;

/** What a student supplies at sign-up. The role is assigned by the server. */
export const studentSignUpSchema = z
  .object({
    fullName: shortTextSchema,
    email: emailSchema,
    phone: phoneSchema,
    password: z
      .string()
      .min(8, "Use at least 8 characters")
      .max(128)
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/\d/, "Include a number"),
    confirmPassword: z.string(),
  })
  .merge(studentProfileSchema)
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type StudentSignUp = z.infer<typeof studentSignUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(128),
});

export type SignIn = z.infer<typeof signInSchema>;

/**
 * Payload for the invite-only organizer/admin creation route.
 *
 * Only a super admin may call it, and the route is the single place a role
 * above `student` can be granted.
 */
export const createStaffSchema = z.object({
  fullName: shortTextSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  designation: shortTextSchema.optional(),
  role: z.enum(["organizer", "admin", "super_admin"]),
  festIds: z.array(idSchema).default([]),
});

export type CreateStaff = z.infer<typeof createStaffSchema>;

export const updateUserSchema = z.object({
  fullName: shortTextSchema.optional(),
  phone: phoneSchema.optional(),
  photoUrl: z.string().url().max(2000).optional(),
  student: studentProfileSchema.partial().optional(),
});

export type UpdateUser = z.infer<typeof updateUserSchema>;
