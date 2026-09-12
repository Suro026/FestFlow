import { ApiError, handler, ok, requireRole } from "@/server/api";
import { COLLECTIONS, adminAuth, adminDb } from "@/server/firebase-admin";
import { emailService } from "@/server/email";
import { staffInviteEmail } from "@/server/email/templates";

/** POST /api/admin/staff/[id]/invite — re-send the password-set link. */
export const POST = handler(async (request, context) => {
  const caller = await requireRole(request, "admin");
  const { id } = await context.params;
  if (!id) throw ApiError.badRequest("Missing staff id.");

  const snap = await adminDb().collection(COLLECTIONS.users).doc(id).get();
  if (!snap.exists) throw ApiError.notFound("No such staff account.");
  const data = snap.data()!;
  if (data.role === "student") throw ApiError.unprocessable("That account is a student.");

  const link = await adminAuth().generatePasswordResetLink(String(data.email));
  const mailer = emailService();
  const delivery = await mailer.send(
    staffInviteEmail({
      to: String(data.email),
      fullName: String(data.fullName ?? "there"),
      roleLabel: String(data.role).replace("_", " "),
      setPasswordLink: link,
      invitedBy: caller.email,
    }),
  );

  return ok({ emailed: mailer.canSend && delivery.ok, provider: mailer.name, ...(mailer.canSend ? {} : { setPasswordLink: link }) });
});
