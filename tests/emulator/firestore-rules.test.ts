import { readFileSync } from "node:fs";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * firestore.rules, exercised the way a client would exercise them.
 *
 * Roles come from token claims exactly as in production; documents are
 * seeded with rules disabled, then read and written under each identity.
 */

let env: RulesTestEnvironment;
const [host = "127.0.0.1", port = "8080"] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");

const student = { uid: "stu1", email: "stu1@festflow.test", email_verified: true, role: "student", festIds: [] as string[] };
const mate = { uid: "stu2", email: "stu2@festflow.test", email_verified: true, role: "student", festIds: [] as string[] };
const stranger = { uid: "stu3", email: "stu3@festflow.test", email_verified: true, role: "student", festIds: [] as string[] };
const volunteer = { uid: "org1", email: "org1@festflow.test", email_verified: true, role: "volunteer", festIds: ["fest1"] };
const otherVolunteer = { uid: "org2", email: "org2@festflow.test", email_verified: true, role: "volunteer", festIds: ["fest2"] };
const admin = { uid: "adm1", email: "adm1@festflow.test", email_verified: true, role: "admin", festIds: ["fest1"] };
const otherAdmin = { uid: "adm2", email: "adm2@festflow.test", email_verified: true, role: "admin", festIds: ["fest2"] };

const as = (claims: { uid: string } & Record<string, unknown>) => {
  const { uid, ...token } = claims;
  return env.authenticatedContext(uid, token).firestore();
};
const anon = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: process.env.GCLOUD_PROJECT ?? "festflow-test",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host, port: Number(port) },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const now = new Date();
    await setDoc(doc(db, "users", student.uid), { id: student.uid, email: student.email, name: "Stu One", role: "student", disabled: false, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "fests", "fest1"), { id: "fest1", slug: "bits2bytes", name: "Bits2Bytes", status: "published", organizationName: "T", startDate: "2026-09-25", endDate: "2026-09-27", stats: { events: 1, registrations: 0, checkIns: 0 }, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "fests", "draft"), { id: "draft", slug: "secret", name: "Secret", status: "draft", organizationName: "T", startDate: "2026-10-01", endDate: "2026-10-02", stats: { events: 0, registrations: 0, checkIns: 0 }, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "events", "ev1"), { id: "ev1", festId: "fest1", slug: "ctf", title: "CTF", status: "published", eventType: "team", capacity: 10, registeredCount: 1, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "registrations", "reg1"), {
      id: "reg1", eventId: "ev1", festId: "fest1", userId: student.uid, type: "team", teamName: "NP", status: "confirmed", seats: 2, ticketCode: "FF-7K2M9QX4TB",
      members: [{ name: "Stu One", email: student.email, userId: student.uid, isLeader: true, inviteStatus: "accepted" }, { name: "Stu Two", email: mate.email, isLeader: false, inviteStatus: "pending" }],
      memberEmails: [student.email, mate.email], eventTitle: "CTF", userName: "Stu One", userEmail: student.email, createdAt: now, updatedAt: now,
    });
    await setDoc(doc(db, "attendance", "reg1"), { id: "reg1", registrationId: "reg1", eventId: "ev1", festId: "fest1", userId: student.uid, ticketCode: "FF-7K2M9QX4TB", scannedAt: now, scannedBy: volunteer.uid, method: "qr", createdAt: now, updatedAt: now });
    await setDoc(doc(db, "notifications", "n1"), { id: "n1", userId: student.uid, type: "team_invite", title: "Hi", body: "", read: false, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "certificates", "ev1_stu1"), { id: "ev1_stu1", userId: student.uid, eventId: "ev1", festId: "fest1", registrationId: "reg1", certificateNumber: "FF-2026-ABCDEFGH", type: "participation", recipientName: "Stu One", recipientEmail: student.email, eventTitle: "CTF", festName: "Bits2Bytes", revoked: false, delivery: { status: "sent", attempts: 1 }, issuedAt: now, issuedBy: admin.uid, createdAt: now, updatedAt: now });
    await setDoc(doc(db, "emailLog", "e1"), { to: student.email, template: "registration_confirmed", status: "sent", festId: "fest1", createdAt: now });
    await setDoc(doc(db, "auditLog", "a1"), { action: "event_updated", actorId: admin.uid, festId: "fest1", summary: "x", createdAt: now });
  });
});

describe("users", () => {
  it("a student reads and edits their own profile but cannot change their role", async () => {
    const db = as(student);
    await assertSucceeds(getDoc(doc(db, "users", student.uid)));
    await assertSucceeds(updateDoc(doc(db, "users", student.uid), { name: "Renamed", updatedAt: new Date() }));
    await assertFails(updateDoc(doc(db, "users", student.uid), { role: "super_admin", updatedAt: new Date() }));
  });
  it("another student cannot read the profile; staff can", async () => {
    await assertFails(getDoc(doc(as(stranger), "users", student.uid)));
    await assertSucceeds(getDoc(doc(as(admin), "users", student.uid)));
  });
});

describe("fests and events (public catalogue)", () => {
  it("anyone reads published fests by slug, nobody reads drafts anonymously", async () => {
    await assertSucceeds(getDocs(query(collection(anon(), "fests"), where("slug", "==", "bits2bytes"), where("status", "==", "published"))));
    await assertFails(getDoc(doc(anon(), "fests", "draft")));
    await assertSucceeds(getDoc(doc(as(admin), "fests", "draft")));
  });
  it("events are never written from a client, even by an admin", async () => {
    await assertFails(setDoc(doc(as(admin), "events", "ev9"), { title: "Rogue", festId: "fest1" }));
    await assertFails(updateDoc(doc(as(volunteer), "events", "ev1"), { capacity: 9999 }));
  });
});

describe("registrations", () => {
  it("the owner and a named teammate can read the entry; a stranger cannot", async () => {
    await assertSucceeds(getDoc(doc(as(student), "registrations", "reg1")));
    await assertSucceeds(getDoc(doc(as(mate), "registrations", "reg1")));
    await assertFails(getDoc(doc(as(stranger), "registrations", "reg1")));
    await assertFails(getDoc(doc(anon(), "registrations", "reg1")));
  });
  it("list queries are provable only when scoped to the caller", async () => {
    await assertSucceeds(getDocs(query(collection(as(student), "registrations"), where("userId", "==", student.uid))));
    await assertSucceeds(getDocs(query(collection(as(mate), "registrations"), where("memberEmails", "array-contains", mate.email))));
    await assertFails(getDocs(query(collection(as(stranger), "registrations"), where("memberEmails", "array-contains", mate.email))));
    await assertFails(getDocs(collection(as(student), "registrations")));
  });
  it("staff read within their fest only", async () => {
    await assertSucceeds(getDoc(doc(as(volunteer), "registrations", "reg1")));
    await assertFails(getDoc(doc(as(otherVolunteer), "registrations", "reg1")));
    await assertSucceeds(getDocs(query(collection(as(volunteer), "registrations"), where("festId", "==", "fest1"))));
  });
  it("clients never create registrations, and the owner may only cancel", async () => {
    await assertFails(setDoc(doc(as(student), "registrations", "forged"), { userId: student.uid, eventId: "ev1", festId: "fest1", status: "confirmed" }));
    await assertFails(updateDoc(doc(as(student), "registrations", "reg1"), { seats: 50, updatedAt: new Date() }));
    await assertFails(updateDoc(doc(as(mate), "registrations", "reg1"), { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }));
    await assertSucceeds(updateDoc(doc(as(student), "registrations", "reg1"), { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }));
  });
});

describe("attendance", () => {
  it("is readable by the holder, a teammate, and fest staff; never written by clients", async () => {
    await assertSucceeds(getDoc(doc(as(student), "attendance", "reg1")));
    await assertSucceeds(getDoc(doc(as(mate), "attendance", "reg1")));
    await assertSucceeds(getDoc(doc(as(volunteer), "attendance", "reg1")));
    await assertFails(getDoc(doc(as(stranger), "attendance", "reg1")));
    await assertFails(setDoc(doc(as(volunteer), "attendance", "reg2"), { registrationId: "reg2", eventId: "ev1", festId: "fest1", userId: "x" }));
  });
  it("staff may read a not-yet-existing record (the scan transaction's first step); students may not", async () => {
    await assertSucceeds(getDoc(doc(as(volunteer), "attendance", "reg-new")));
    await assertSucceeds(getDoc(doc(as(volunteer), "foodCollections", "reg-new_2026-09-26_lunch_1")));
    await assertFails(getDoc(doc(as(student), "attendance", "reg-new")));
    await assertFails(getDoc(doc(as(otherVolunteer), "attendance", "reg1")));
  });
  it("an volunteer records a scan for their fest exactly once", async () => {
    const db = as(volunteer);
    const record = { id: "reg2", registrationId: "reg2", eventId: "ev1", festId: "fest1", userId: student.uid, ticketCode: "FF-AAAAAAAAAA", scannedAt: new Date(), scannedBy: volunteer.uid, method: "qr", createdAt: new Date(), updatedAt: new Date() };
    await assertSucceeds(setDoc(doc(db, "attendance", "reg2"), record));
    await assertFails(setDoc(doc(db, "attendance", "reg2"), { ...record, scannedAt: new Date() })); // second scan is an update → denied
    await assertFails(setDoc(doc(as(otherVolunteer), "attendance", "reg3"), { ...record, id: "reg3", registrationId: "reg3", scannedBy: otherVolunteer.uid }));
  });
});

describe("notifications", () => {
  it("belong to their recipient: read, mark read, delete — nothing else", async () => {
    await assertSucceeds(getDocs(query(collection(as(student), "notifications"), where("userId", "==", student.uid))));
    await assertSucceeds(updateDoc(doc(as(student), "notifications", "n1"), { read: true, readAt: new Date(), updatedAt: new Date() }));
    await assertFails(updateDoc(doc(as(student), "notifications", "n1"), { title: "Edited", updatedAt: new Date() }));
    await assertFails(getDoc(doc(as(stranger), "notifications", "n1")));
    await assertFails(updateDoc(doc(as(stranger), "notifications", "n1"), { read: true, readAt: new Date(), updatedAt: new Date() }));
    await assertFails(setDoc(doc(as(admin), "notifications", "n2"), { userId: student.uid, type: "announcement", title: "x", body: "", read: false }));
  });
});

describe("certificates, email log, audit log", () => {
  it("a certificate is readable by its recipient and staff, never client-written", async () => {
    await assertSucceeds(getDoc(doc(as(student), "certificates", "ev1_stu1")));
    await assertFails(getDoc(doc(as(stranger), "certificates", "ev1_stu1")));
    await assertSucceeds(getDoc(doc(as(volunteer), "certificates", "ev1_stu1")));
    await assertFails(updateDoc(doc(as(student), "certificates", "ev1_stu1"), { type: "winner" }));
  });
  it("emailLog and auditLog are admin-scoped reads and server-only writes", async () => {
    await assertSucceeds(getDocs(query(collection(as(admin), "emailLog"), where("festId", "==", "fest1"))));
    await assertFails(getDocs(query(collection(as(student), "emailLog"), where("festId", "==", "fest1"))));
    await assertFails(getDocs(query(collection(as(volunteer), "emailLog"), where("festId", "==", "fest1"))));
    await assertFails(setDoc(doc(as(admin), "emailLog", "e2"), { to: "x", status: "sent" }));
    await assertSucceeds(getDocs(query(collection(as(admin), "auditLog"), where("festId", "==", "fest1"))));
    await assertFails(getDocs(query(collection(as(otherAdmin), "auditLog"), where("festId", "==", "fest1"))));
    await assertFails(getDocs(query(collection(as(volunteer), "auditLog"), where("festId", "==", "fest1"))));
    await assertFails(setDoc(doc(as(admin), "auditLog", "a2"), { action: "x" }));
  });
  it("an unknown collection is denied by default", async () => {
    await assertFails(getDoc(doc(as(admin), "secrets", "s1")));
    expect(true).toBe(true);
  });
});
