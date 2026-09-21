import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { decideEntry, decideMeal, parseTicketCode } from "@/lib/offline/scanner";
import { listQueue, replaceCheckins, replaceMeals, replaceRoster, type RosterEntry } from "@/lib/offline/db";
import { event } from "./fixtures";

/**
 * QR validation as the gate sees it: the roster is cached in IndexedDB and
 * every decision is made locally. fake-indexeddb stands in for the browser.
 */

const ev = event({ id: "ev1", title: "Capture the Flag" });
const other = event({ id: "ev2", slug: "quiz", title: "Quiz Prelims" });

const roster = (over: Partial<RosterEntry> = {}): RosterEntry => ({
  ticketCode: "FF-7K2M9QX4TB",
  registrationId: "reg1",
  eventId: "ev1",
  festId: "fest1",
  userId: "u1",
  userName: "Ishita Rao",
  userEmail: "ishita@x.test",
  memberCount: 1,
  status: "confirmed",
  ...over,
});

const scan = (code: string, e = ev) => decideEntry({ event: e, code, scannedBy: "vol1", online: false, gate: "Gate A" });

describe("parseTicketCode", () => {
  it("accepts a bare code, the public /t/ URL the QR encodes, and lowercase input", () => {
    expect(parseTicketCode("FF-7K2M9QX4TB")).toBe("FF-7K2M9QX4TB");
    expect(parseTicketCode("https://plansphere.in/t/FF-7K2M9QX4TB")).toBe("FF-7K2M9QX4TB");
    expect(parseTicketCode("  ff-7k2m9qx4tb ")).toBe("FF-7K2M9QX4TB");
  });
  it("rejects anything that is not a ticket", () => {
    expect(parseTicketCode("https://evil.example/t/FF-7K2M9QX4TB?x=1")).toBe("FF-7K2M9QX4TB"); // the code is what matters, not the host
    expect(parseTicketCode("FF-0000INVALID")).toBeNull();
    expect(parseTicketCode("FF-7K2M9QX4TO")).toBeNull();
    expect(parseTicketCode("https://plansphere.in/t/FF-7K2M9QX4TB1")).toBeNull(); // too long — not truncated to a valid code
    expect(parseTicketCode("hello")).toBeNull();
    expect(parseTicketCode("")).toBeNull();
  });
});

describe("decideEntry (offline)", () => {
  beforeEach(async () => {
    await replaceRoster("ev1", [roster(), roster({ ticketCode: "FF-CANCELLED1", registrationId: "reg2", status: "cancelled", userName: "Gone" }), roster({ ticketCode: "FF-TEAMPASS01", registrationId: "reg3", teamName: "Null Pointers", memberCount: 3 })]);
    await replaceRoster("ev2", [roster({ ticketCode: "FF-QUIZONLY01", registrationId: "reg9", eventId: "ev2" })]);
    await replaceCheckins("ev1", []);
    await replaceMeals("ev1", []);
  });

  it("admits a valid ticket once and queues the write", async () => {
    const first = await scan("FF-7K2M9QX4TB");
    expect(first).toMatchObject({ result: "ok", queued: true, registration: { id: "reg1", userName: "Ishita Rao" } });
    const queue = await listQueue();
    expect(queue.some((q) => q.registrationId === "reg1" && q.kind === "entry" && q.gate === "Gate A")).toBe(true);
  });

  it("detects a duplicate scan and says it was this device", async () => {
    await scan("FF-7K2M9QX4TB");
    const second = await scan("FF-7K2M9QX4TB");
    expect(second).toMatchObject({ result: "already-recorded", by: "this device" });
    expect(second.result === "already-recorded" && second.at instanceof Date).toBe(true);
  });

  it("refuses a cancelled entry and an unknown code", async () => {
    expect(await scan("FF-CANCELLED1")).toEqual({ result: "cancelled" });
    expect(await scan("FF-NOTINROSTR")).toEqual({ result: "not-found" });
  });

  it("flags a ticket for a different event as wrong-event", async () => {
    expect(await scan("FF-QUIZONLY01")).toMatchObject({ result: "wrong-event" });
    expect(await scan("FF-QUIZONLY01", other)).toMatchObject({ result: "ok" });
  });

  it("reads the code out of the URL the QR encodes", async () => {
    const code = parseTicketCode("https://plansphere.in/t/FF-TEAMPASS01");
    expect(code).toBe("FF-TEAMPASS01");
    expect(await scan(code!)).toMatchObject({ result: "ok", registration: { teamName: "Null Pointers", memberCount: 3 } });
  });
});

describe("decideMeal (offline)", () => {
  beforeEach(async () => {
    await replaceRoster("ev1", [roster({ ticketCode: "FF-TEAMPASS01", registrationId: "reg3", teamName: "Null Pointers", memberCount: 2 })]);
    await replaceMeals("ev1", []);
  });

  const meal = (code: string) => decideMeal({ event: ev, code, scannedBy: "vol1", online: false, mealType: "lunch", servedOn: "2026-09-25" });

  it("serves one meal per team member, then refuses", async () => {
    expect(await meal("FF-TEAMPASS01")).toMatchObject({ result: "ok", serving: { n: 1, of: 2 } });
    expect(await meal("FF-TEAMPASS01")).toMatchObject({ result: "ok", serving: { n: 2, of: 2 } });
    expect(await meal("FF-TEAMPASS01")).toMatchObject({ result: "already-recorded" });
  });

  it("keeps meal slots independent", async () => {
    await meal("FF-TEAMPASS01");
    await meal("FF-TEAMPASS01");
    const dinner = await decideMeal({ event: ev, code: "FF-TEAMPASS01", scannedBy: "vol1", online: false, mealType: "dinner", servedOn: "2026-09-25" });
    expect(dinner).toMatchObject({ result: "ok", serving: { n: 1, of: 2 } });
  });
});
