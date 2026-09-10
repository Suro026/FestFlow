import { createStaffSchema, type UserRole } from "@/core/models/user";
import {
  ApiError,
  handler,
  ok,
  readBody,
  requireRole,
} from "@/server/api";
import {
  COLLECTIONS,
  FieldValue,
  adminAuth,
  adminDb,
} from "@/server/firebase-admin";
import { emailService } from "@/server/email";
import { staffInviteEmail } from "@/server/email/templates";

/**
 * Invite-only staff accounts.
 *
 * This route is the *only* place a role above `student` is ever granted.
 * Everything else in the system reads the role from the Auth token's custom
 * claim, and Firestore rules refuse any client write that touches `role` — so
 * an account can only become an organizer by passing through here, and only a
 * super admin can make that happen.
 *
 * The previous project let anyone who found /admin-register create themselves
 * an organizer record, which is the hole this closes.
 */

const ROLE_LABELS: Record<UserRole, string> = {
  student: "Student",
  organizer: "Organizer",
  admin: "Admin",
  super_admin: "Super Admin",
};

/**
 * A throwaway password for the new account.
 *
 * It is never shown to anyone. The invitee sets their own password through the
 * emailed link, so this only has to be strong enough that it cannot be guessed
 * in the window before they do.
 */
const throwawayPassword = (): string => {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return `Aa1!${Buffer.from(bytes).toString("base64url")}`;
};

/** POST /api/admin/staff — create an organizer, admin or super admin. */
export const POST = handler(async (request) => {
  const caller = await requireRole(request, "super_admin");
  const input = await readBody(request, createStaffSchema);

  const auth = adminAuth();
  const db = adminDb();

  // Reject an address that already has an account rather than silently
  // upgrading it: promoting an existing student is a different, deliberate
  // action and belongs on the PATCH route.
  try {
    const existing = await auth.getUserByEmail(input.email);

    throw ApiError.conflict(
      `${input.email} already has an account (${existing.uid}). ` +
        `Change their role from the organizer list instead of re-inviting them.`,
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;

    const code = (error as { code?: string }).code;

    // Anything other than "no such user" is a real failure worth surfacing.
    if (code !== "auth/user-not-found") throw error;
  }

  // An organizer scoped to no fests can see nothing, which looks like a broken
  // account rather than a deliberate one. Admins are unscoped, so it only
  // matters for the organizer role.
  if (input.role === "organizer" && input.festIds.length === 0) {
    throw ApiError.unprocessable(
      "An organizer needs at least one fest assigned, otherwise they will not " +
        "be able to see anything after signing in.",
    );
  }

  // Verify every referenced fest exists, so a typo does not produce an
  // organizer scoped to a fest id that will never match.
  for (const festId of input.festIds) {
    const fest = await db.collection(COLLECTIONS.fests).doc(festId).get();
    if (!fest.exists) throw ApiError.unprocessable(`No fest with id "${festId}".`);
  }

  const created = await auth.createUser({
    email: input.email,
    displayName: input.fullName,
    password: throwawayPassword(),
    emailVerified: false,
    disabled: false,
  });

  try {
    // The claim is what Firestore rules and every API route actually trust.
    await auth.setCustomUserClaims(created.uid, {
      role: input.role,
      festIds: input.festIds,
    });

    await db
      .collection(COLLECTIONS.users)
      .doc(created.uid)
      .set({
        id: created.uid,
        email: input.email,
        fullName: input.fullName,
        ...(input.phone ? { phone: input.phone } : {}),
        role: input.role,
        emailVerified: false,
        disabled: false,
        organizer: {
          ...(input.designation ? { designation: input.designation } : {}),
          festIds: input.festIds,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        invitedBy: caller.uid,
      });
  } catch (error) {
    // Do not leave an Auth account with no profile and no claims behind: it
    // would be able to sign in and land in a broken, roleless state.
    await auth.deleteUser(created.uid).catch(() => undefined);
    throw error;
  }

  // A link, not a password. A password mailed in plain text lives in the
  // recipient's inbox forever and cannot be withdrawn; this expires.
  const setPasswordLink = await auth.generatePasswordResetLink(input.email);

  const mailer = emailService();

  const delivery = await mailer.send(
    staffInviteEmail({
      to: input.email,
      fullName: input.fullName,
      roleLabel: ROLE_LABELS[input.role],
      setPasswordLink,
      invitedBy: caller.email,
    }),
  );

  return ok(
    {
      user: {
        id: created.uid,
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        festIds: input.festIds,
      },
      invite: {
        emailed: mailer.canSend && delivery.ok,
        provider: mailer.name,
        /**
         * Returned only when no provider can actually send, so the super admin
         * who just created the account can pass the link on themselves.
         * Without this the feature is unusable until email is configured.
         * It is a single-use, expiring link, disclosed to the one person
         * already authorised to create the account.
         */
        ...(mailer.canSend ? {} : { setPasswordLink }),
      },
    },
    201,
  );
});

/** GET /api/admin/staff — list non-student accounts. */
export const GET = handler(async (request) => {
  await requireRole(request, "admin");

  const snapshot = await adminDb()
    .collection(COLLECTIONS.users)
    .where("role", "in", ["organizer", "admin", "super_admin"])
    .get();

  const staff = snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      email: data.email ?? "",
      fullName: data.fullName ?? "",
      role: data.role ?? "organizer",
      designation: data.organizer?.designation ?? null,
      festIds: data.organizer?.festIds ?? [],
      disabled: data.disabled === true,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    };
  });

  staff.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return ok({ staff });
});
