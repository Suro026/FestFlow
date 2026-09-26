import { registerEventSchema } from "@/core/models/fest";
import { defaultRegistrationFields } from "@/core/models/registration-fields";
import { hasAtLeast } from "@/core/permissions";
import { ApiError, authenticate, handler, ok, readBody, requirePasswordChanged } from "@/server/api";
import { RATE_LIMITS } from "@/server/rate-limit";
import { COLLECTIONS, FieldValue, adminDb } from "@/server/firebase-admin";
import { applyClaims } from "@/server/credentials";
import { compact, docToJson } from "@/server/serialize";
import { audit } from "@/server/audit";

/**
 * Self-service event registration — the one route that lets any signed-in
 * account create a fest, not just a super admin.
 *
 * `POST /api/admin/fests` (super admin only) still exists for platform staff.
 * This route is additive: an Event Head signs in (or creates an account),
 * fills the three-step wizard (organization, event, themselves), and
 * registers their event directly — no invitation, no approval queue, no
 * pending state. Everything the wizard collects lands on the `Fest`
 * document in this same request (see `registerEventSchema` and the field
 * comments on `Fest` in `core/models/fest.ts`); there is nothing left to
 * fill in from a "pending registrations" screen because there is no such
 * screen. In the same request:
 *
 *  1. The fest is created with `ownerId` set to the caller — the field
 *     already existed on `Fest` for exactly this ("the admin accountable for
 *     the fest"), just never had a path that set it to anyone but a super
 *     admin.
 *  2. The caller is promoted to `admin`, scoped to the new fest (merged into
 *     whatever fests they already manage) — this is what makes every
 *     existing `/admin/*` page and permission check work for them for free,
 *     without a parallel ownership-based authorization system. A `student`
 *     or `volunteer` becomes an `admin`; an existing `admin`/`super_admin`
 *     keeps their role and simply gains this fest in scope.
 *  3. Owning the fest is what then lets them create *other* admins for it —
 *     see `creatableRoles()` in `core/permissions.ts` and the ownership
 *     branch in `POST /api/admin/staff` — without holding the platform-wide
 *     `staff:createAdmin` permission a plain admin lacks.
 *
 * The platform `super_admin` role is untouched: it still sees and can act on
 * every fest regardless of `ownerId`, and remains the only way to create
 * another super admin.
 */

/** URL-safe slug from a name. Mirrors `src/lib/utils.ts`'s `slugify`, kept separate so this server route has no reason to import a client-side styling helper. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

export const POST = handler(async (request) => {
  const caller = await authenticate(request);
  requirePasswordChanged(caller);

  const input = await readBody(request, registerEventSchema);
  const db = adminDb();

  // The public address is derived, not typed by hand — a first-time visitor
  // is not asked to invent a URL slug. Collisions get a numeric suffix.
  const base = slugify(input.name) || "event";
  let slug = base;
  for (let suffix = 2; suffix <= 50; suffix += 1) {
    const clash = await db.collection(COLLECTIONS.fests).where("slug", "==", slug).limit(1).get();
    if (clash.empty) break;
    slug = `${base}-${suffix}`;
  }

  const ref = db.collection(COLLECTIONS.fests).doc();

  await ref.set(
    compact({
      id: ref.id,
      name: input.name,
      slug,
      description: input.description,
      organizationName: input.organizationName,
      organizationType: input.organizationType,
      organizationWebsite: input.organizationWebsite,
      contactEmail: input.contactEmail,
      venue: input.venue,
      city: input.city,
      state: input.state,
      startDate: input.startDate,
      endDate: input.endDate,
      festType: input.festType,
      expectedParticipants: input.expectedParticipants,
      eventHead: input.eventHead,
      status: "draft",
      visibility: "public",
      registrationState: "upcoming",
      stats: { events: 0, registrations: 0, checkIns: 0 },
      registrationFields: defaultRegistrationFields(),
      createdBy: caller.uid,
      ownerId: caller.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }),
  );

  // A super admin is already unscoped everywhere; everyone else needs the
  // new fest added to what they manage, promoted to admin if they were not
  // already at least one. Existing fests they manage are kept, not replaced.
  if (caller.role !== "super_admin") {
    const newFestIds = Array.from(new Set([...caller.festIds, ref.id]));
    const newRole = hasAtLeast(caller.role, "admin") ? caller.role : "admin";

    // Not revoked: this is a self-elevation the caller just triggered by
    // registering their own event, not a change made to them by someone else
    // — they should not be signed out of the session they are sitting in.
    await applyClaims(caller.uid, { role: newRole, festIds: newFestIds, mustChangePassword: caller.mustChangePassword }, { revoke: false });
    await db
      .collection(COLLECTIONS.users)
      .doc(caller.uid)
      .set({ role: newRole, festIds: newFestIds, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  await audit(caller, {
    action: "fest_registered",
    summary: `Registered "${input.name}" (${slug})`,
    festId: ref.id,
    subjectType: "fest",
    subjectId: ref.id,
    details: { slug, festType: input.festType, organizationName: input.organizationName, organizationType: input.organizationType },
  });

  const created = await ref.get();
  const fest = docToJson(created);
  if (!fest) throw ApiError.unavailable("The event was created but could not be read back. Refresh and it will be there.");

  return ok({ fest }, 201);
}, { rateLimit: RATE_LIMITS.authenticated.registerEvent });
