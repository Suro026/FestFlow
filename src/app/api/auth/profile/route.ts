import { isProfileComplete, studentProfileSchema } from "@/core/models/user";
import { authenticate, handler, ok, readBody } from "@/server/api";
import { RATE_LIMITS } from "@/server/rate-limit";
import { COLLECTIONS, FieldValue, adminDb } from "@/server/firebase-admin";
import { compact } from "@/server/serialize";

/**
 * POST /api/auth/profile — finish a student profile after sign-up.
 *
 * Reachable while `profileCompleted` is false, which is the state a new
 * account is in, so it cannot use `requireRole`'s completeness expectations.
 * The server decides whether the profile now counts as complete; the client
 * does not get to assert it.
 */
export const POST = handler(async (request) => {
  const caller = await authenticate(request);
  const input = await readBody(request, studentProfileSchema);

  const completed = isProfileComplete({ role: caller.role, ...input });

  await adminDb()
    .collection(COLLECTIONS.users)
    .doc(caller.uid)
    .set(
      compact({
        id: caller.uid,
        uid: caller.uid,
        email: caller.email,
        name: input.name.trim(),
        phone: input.phone.trim(),
        college: input.college.trim(),
        studentId: input.studentId?.trim(),
        department: input.department?.trim(),
        year: input.year,
        role: caller.role,
        profileCompleted: completed,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      { merge: true },
    );

  return ok({ profileCompleted: completed });
}, { rateLimit: RATE_LIMITS.authenticated.default });
