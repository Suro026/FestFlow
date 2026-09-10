import { z } from "zod";
import { idSchema, shortTextSchema } from "@/core/models/common";
import { ApiError, handler, ok, readBody, requireRole } from "@/server/api";
import {
  COLLECTIONS,
  FieldValue,
  adminAuth,
  adminDb,
} from "@/server/firebase-admin";

/**
 * Editing and removing staff accounts. Super admin only.
 *
 * The guards here exist because the failure modes are unrecoverable from
 * inside the app: a super admin who demotes themselves, or removes the last
 * remaining super admin, locks the project out of its own administration and
 * the only way back is a script run against the service account.
 */

const updateStaffSchema = z
  .object({
    fullName: shortTextSchema.optional(),
    designation: shortTextSchema.optional(),
    role: z.enum(["organizer", "admin", "super_admin"]).optional(),
    festIds: z.array(idSchema).optional(),
    disabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Nothing to update",
  });

/** Number of enabled super admins, used for the lockout guards. */
const countActiveSuperAdmins = async (): Promise<number> => {
  const snapshot = await adminDb()
    .collection(COLLECTIONS.users)
    .where("role", "==", "super_admin")
    .get();

  return snapshot.docs.filter((doc) => doc.data().disabled !== true).length;
};

/** PATCH /api/admin/staff/[id] */
export const PATCH = handler(async (request, context) => {
  const caller = await requireRole(request, "super_admin");
  const { id } = await context.params;

  if (!id) throw ApiError.badRequest("Missing staff id.");

  const input = await readBody(request, updateStaffSchema);

  const db = adminDb();
  const auth = adminAuth();

  const ref = db.collection(COLLECTIONS.users).doc(id);
  const snapshot = await ref.get();

  if (!snapshot.exists) throw ApiError.notFound("No such staff account.");

  const current = snapshot.data() ?? {};
  const currentRole = current.role as string | undefined;

  if (currentRole === "student") {
    throw ApiError.unprocessable(
      "That account is a student. Promoting a student is not supported here " +
        "because their profile has no organizer record yet.",
    );
  }

  const losingSuperAdmin =
    currentRole === "super_admin" &&
    ((input.role !== undefined && input.role !== "super_admin") || input.disabled === true);

  if (losingSuperAdmin) {
    if (id === caller.uid) {
      throw ApiError.unprocessable(
        "You cannot remove your own super admin access — you would be locked " +
          "out immediately. Ask another super admin to do it.",
      );
    }

    if ((await countActiveSuperAdmins()) <= 1) {
      throw ApiError.unprocessable(
        "This is the last active super admin. Promote someone else first, " +
          "otherwise nobody will be able to administer the project.",
      );
    }
  }

  const role = input.role ?? currentRole ?? "organizer";
  const festIds = input.festIds ?? (current.organizer?.festIds as string[] | undefined) ?? [];

  if (role === "organizer" && festIds.length === 0) {
    throw ApiError.unprocessable("An organizer needs at least one fest assigned.");
  }

  for (const festId of input.festIds ?? []) {
    const fest = await db.collection(COLLECTIONS.fests).doc(festId).get();
    if (!fest.exists) throw ApiError.unprocessable(`No fest with id "${festId}".`);
  }

  // Claims first. If the document write fails afterwards the claim is merely
  // ahead of its mirror, which `authenticate` resolves by taking the weaker of
  // the two — whereas the reverse order would leave a stale claim granting
  // access the record says was removed.
  if (input.role !== undefined || input.festIds !== undefined) {
    await auth.setCustomUserClaims(id, { role, festIds });
    // Force a re-auth so the new claim takes effect immediately instead of on
    // the next hourly token refresh.
    await auth.revokeRefreshTokens(id);
  }

  if (input.disabled !== undefined) {
    await auth.updateUser(id, { disabled: input.disabled });
    if (input.disabled) await auth.revokeRefreshTokens(id);
  }

  await ref.update({
    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    ...(input.role !== undefined ? { role } : {}),
    ...(input.disabled !== undefined ? { disabled: input.disabled } : {}),
    ...(input.festIds !== undefined ? { "organizer.festIds": festIds } : {}),
    ...(input.designation !== undefined ? { "organizer.designation": input.designation } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return ok({ id, role, festIds, disabled: input.disabled ?? current.disabled === true });
});

/**
 * DELETE /api/admin/staff/[id]
 *
 * Removes both the Auth account and the profile document. The previous
 * project deleted only the Firestore record, which left the person able to
 * sign in perfectly well — they simply had no profile, and a route guard that
 * read the document treated it as "not an organizer" while Firebase still
 * considered them a valid, authenticated user.
 */
export const DELETE = handler(async (request, context) => {
  const caller = await requireRole(request, "super_admin");
  const { id } = await context.params;

  if (!id) throw ApiError.badRequest("Missing staff id.");

  if (id === caller.uid) {
    throw ApiError.unprocessable("You cannot delete your own account.");
  }

  const db = adminDb();
  const ref = db.collection(COLLECTIONS.users).doc(id);
  const snapshot = await ref.get();

  if (!snapshot.exists) throw ApiError.notFound("No such staff account.");

  const data = snapshot.data() ?? {};

  if (data.role === "super_admin" && (await countActiveSuperAdmins()) <= 1) {
    throw ApiError.unprocessable("This is the last active super admin.");
  }

  // Auth first: if this succeeds and the document delete fails, the leftover
  // document is inert. The reverse would leave a sign-in-capable account with
  // no record of what it was.
  await adminAuth()
    .deleteUser(id)
    .catch((error: { code?: string }) => {
      if (error.code !== "auth/user-not-found") throw error;
    });

  await ref.delete();

  return ok({ id, deleted: true });
});
