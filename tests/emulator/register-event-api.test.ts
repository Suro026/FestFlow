import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { COLLECTIONS, adminDb } from "@/server/firebase-admin";
import { POST as registerEvent } from "@/app/api/register-event/route";
import { POST as createStaff } from "@/app/api/admin/staff/route";
import { callRoute, freshToken, mintUser, resetAuth, resetFirestore, type TestUser } from "./harness";

/**
 * POST /api/register-event through the real handler against the Firebase Auth
 * and Firestore emulators — the self-service path any signed-in account may
 * use, with no invitation and no existing super admin involved.
 */

let student: TestUser;
let scopedAdmin: TestUser;
let superAdmin: TestUser;

const validBody = (name: string) => ({
  // Step 1 — organization
  organizationName: "Test Institute of Technology",
  organizationType: "college" as const,
  organizationWebsite: "https://test-institute.edu",
  contactEmail: "events@test-institute.edu",
  city: "Chennai",
  state: "Tamil Nadu",
  // Step 2 — event
  name,
  description: "A three-day tech and culture fest.",
  festType: "tech" as const,
  startDate: "2026-11-01",
  endDate: "2026-11-03",
  venue: "Main campus",
  expectedParticipants: 500,
  // Step 3 — event head
  eventHead: {
    name: "Meena R. Kumar",
    designation: "Cultural Secretary",
    phone: "+919000000000",
    linkedin: "https://linkedin.com/in/meena-kumar",
  },
});

beforeAll(async () => {
  await resetAuth();
  student = await mintUser({ name: "Future Event Head" });
  scopedAdmin = await mintUser({ role: "admin", festIds: ["other-fest"], name: "Existing Admin" });
  superAdmin = await mintUser({ role: "super_admin", name: "Platform Owner" });
});

beforeEach(async () => {
  await resetFirestore();
  // resetFirestore() wipes the `users` profile docs mintUser() wrote in
  // beforeAll (Auth accounts and their custom claims are untouched) — put
  // them back to their minted state before each test.
  for (const u of [student, scopedAdmin, superAdmin]) {
    const festIds = u === scopedAdmin ? ["other-fest"] : [];
    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(u.uid)
      .set({
        id: u.uid,
        email: u.email,
        name: u.name,
        role: u.role,
        festIds,
        profileCompleted: true,
        mustChangePassword: false,
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...(u.role === "student" ? { college: "Test College", phone: "+919000000000" } : {}),
      });
  }
});

describe("authorization", () => {
  it("requires a signed-in caller", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", body: validBody("No Token Fest") });
    expect(res.status).toBe(401);
  });

  it("rejects an empty body", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: { name: "" } });
    expect(res.status).toBe(400);
  });

  it("rejects a body missing a required step-3 field", async () => {
    const { eventHead: _eventHead, ...rest } = validBody("Missing Event Head");
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: rest });
    expect(res.status).toBe(400);
  });
});

describe("a plain student registers an event", () => {
  it("creates the fest, sets ownerId, and promotes the caller to admin scoped to it", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: validBody("Aurora 26") });
    expect(res.status).toBe(201);
    expect(res.body.fest.ownerId).toBe(student.uid);
    expect(res.body.fest.createdBy).toBe(student.uid);
    expect(res.body.fest.status).toBe("draft");
    expect(res.body.fest.slug).toBe("aurora-26");

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(student.uid).get();
    expect(userDoc.data()?.role).toBe("admin");
    expect(userDoc.data()?.festIds).toEqual([res.body.fest.id]);
  });

  it("stores every wizard field on the fest document, with no verification or pending status", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: validBody("Full Wizard Fest") });
    expect(res.status).toBe(201);
    const fest = res.body.fest;
    expect(fest.organizationName).toBe("Test Institute of Technology");
    expect(fest.organizationType).toBe("college");
    expect(fest.organizationWebsite).toBe("https://test-institute.edu");
    expect(fest.contactEmail).toBe("events@test-institute.edu");
    expect(fest.city).toBe("Chennai");
    expect(fest.state).toBe("Tamil Nadu");
    expect(fest.venue).toBe("Main campus");
    expect(fest.expectedParticipants).toBe(500);
    expect(fest.eventHead).toMatchObject({ name: "Meena R. Kumar", designation: "Cultural Secretary", phone: "+919000000000" });
    // Instant, no moderation: nothing marks this as pending or unverified.
    expect(fest.status).toBe("draft");
    expect(fest).not.toHaveProperty("verified");
    expect(fest).not.toHaveProperty("approvalStatus");
    expect(fest).not.toHaveProperty("pendingReview");
  });

  it("auto-suffixes a slug collision", async () => {
    const first = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: validBody("Duplicate Name") });
    const second = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: scopedAdmin.idToken, body: validBody("Duplicate Name") });
    expect(first.body.fest.slug).toBe("duplicate-name");
    expect(second.body.fest.slug).toBe("duplicate-name-2");
  });

  it("the new owner can invite another admin for their own fest, but not for someone else's", async () => {
    const created = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: student.idToken, body: validBody("Owner Invites") });
    const ownFestId = created.body.fest.id as string;

    // The token minted at the top of the file predates the promotion above —
    // a fresh sign-in is what actually carries the new "admin" claim.
    const ownerToken = await freshToken(student);

    const invite = await callRoute(createStaff, {
      method: "POST",
      path: "/api/admin/staff",
      token: ownerToken,
      body: { name: "Co-admin", email: `co-admin-${Date.now()}@plansphere.test`, role: "admin", festIds: [ownFestId] },
    });
    expect(invite.status).toBe(201);

    // "other-fest" belongs to nobody here — the owner cannot staff it.
    const seedOtherFest = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: scopedAdmin.idToken, body: validBody("Someone Elses Fest") });
    const otherFestId = seedOtherFest.body.fest.id as string;
    const refreshedOwnerToken = await freshToken(student);
    const denied = await callRoute(createStaff, {
      method: "POST",
      path: "/api/admin/staff",
      token: refreshedOwnerToken,
      body: { name: "Intruder Admin", email: `intruder-${Date.now()}@plansphere.test`, role: "admin", festIds: [otherFestId] },
    });
    expect(denied.status).toBe(403);
  });
});

describe("an existing admin registers a second event", () => {
  it("keeps their existing fests and adds the new one, without a role change", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: scopedAdmin.idToken, body: validBody("Second Fest") });
    expect(res.status).toBe(201);

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(scopedAdmin.uid).get();
    expect(userDoc.data()?.role).toBe("admin");
    expect(userDoc.data()?.festIds).toEqual(expect.arrayContaining(["other-fest", res.body.fest.id]));
  });
});

describe("a platform super admin registers an event", () => {
  it("records ownership without needing a claims change", async () => {
    const res = await callRoute(registerEvent, { method: "POST", path: "/api/register-event", token: superAdmin.idToken, body: validBody("Owner-Recorded Fest") });
    expect(res.status).toBe(201);
    expect(res.body.fest.ownerId).toBe(superAdmin.uid);

    const userDoc = await adminDb().collection(COLLECTIONS.users).doc(superAdmin.uid).get();
    expect(userDoc.data()?.role).toBe("super_admin");
  });
});
