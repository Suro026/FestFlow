"use client";

import * as React from "react";
import type { Repositories } from "@/core/repositories";
import type { Event } from "@/core/models/event";
import type { MealType, ScanOutcome } from "@/core/models/attendance";
import { RepositoryError } from "@/core/models/common";
import {
  countCheckins,
  dequeue,
  enqueue,
  findAnywhere,
  findInRoster,
  getCheckin,
  getMeta,
  getServed,
  listHistory,
  listQueue,
  markCheckedIn,
  pushHistory,
  queueLength,
  replaceCheckins,
  replaceMeals,
  replaceRoster,
  rosterSize,
  setMeta,
  setServed,
  updateQueued,
  type HistoryEntry,
  type RosterEntry,
} from "./db";

/**
 * Offline-first scanning.
 *
 * The decision — valid, duplicate, unknown, cancelled — is made on the device
 * from the cached roster, in under a millisecond, whether or not there is a
 * network. The write is queued and synced when there is one. The server is
 * still the arbiter: if two devices scanned the same ticket offline, the
 * second one to sync learns it was a duplicate and its history is amended.
 */

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Accepts a raw ticket code or the public /t/CODE URL the QR encodes. */
export const parseTicketCode = (raw: string): string | null => {
  const text = raw.trim();
  const fromUrl = text.match(/\/t\/(FF-[0-9A-HJ-NP-Z]{10})/i)?.[1];
  const code = (fromUrl ?? text).toUpperCase();
  return /^FF-[0-9A-HJ-NP-Z]{10}$/.test(code) ? code : null;
};

/* ───────────── roster ───────────── */

export const refreshRoster = async (repos: Repositories, event: Event): Promise<{ roster: number; checkins: number }> => {
  const [registrations, attendance, meals] = await Promise.all([
    repos.registrations.listForEvent(event.id),
    repos.attendance.listByEvent(event.id),
    event.mealSlots.length ? repos.attendance.listMealsByEvent(event.id) : Promise.resolve([]),
  ]);

  const roster: RosterEntry[] = registrations.map((r) => ({
    ticketCode: r.ticketCode,
    registrationId: r.id,
    eventId: r.eventId,
    festId: r.festId,
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    teamName: r.teamName,
    memberCount: Math.max(1, r.members.length),
    status: r.status,
  }));

  await replaceRoster(event.id, roster);
  await replaceCheckins(event.id, attendance.map((a) => ({ registrationId: a.registrationId, at: a.scannedAt.getTime() })));

  const servings = new Map<string, { registrationId: string; servedOn: string; mealType: string; served: number }>();
  for (const m of meals) {
    const key = `${m.registrationId}:${m.servedOn}:${m.mealType}`;
    const cur = servings.get(key);
    servings.set(key, { registrationId: m.registrationId, servedOn: m.servedOn, mealType: m.mealType, served: Math.max(cur?.served ?? 0, m.serving) });
  }
  await replaceMeals(event.id, [...servings.values()]);
  await setMeta(`roster:${event.id}:refreshedAt`, Date.now());

  return { roster: roster.length, checkins: attendance.length };
};

/* ───────────── local decisions ───────────── */

export interface DecideInput {
  event: Event;
  code: string;
  gate?: string;
  scannedBy: string;
  online: boolean;
}

export const decideEntry = async (input: DecideInput): Promise<ScanOutcome> => {
  const { event, code } = input;
  const entry = await findInRoster(event.id, code);

  if (!entry) {
    const elsewhere = await findAnywhere(code);
    const outcome: ScanOutcome = elsewhere ? { result: "wrong-event", expectedEventTitle: "another event" } : { result: "not-found" };
    await pushHistory({ id: uid(), eventId: event.id, kind: "entry", at: Date.now(), ticketCode: code, userName: elsewhere?.userName ?? "—", outcome: outcome.result, queued: false });
    return outcome;
  }

  if (entry.status === "cancelled") {
    await pushHistory({ id: uid(), eventId: event.id, kind: "entry", at: Date.now(), ticketCode: code, userName: entry.userName, teamName: entry.teamName, outcome: "cancelled", queued: false });
    return { result: "cancelled" };
  }

  const existing = await getCheckin(event.id, entry.registrationId);
  if (existing) {
    await pushHistory({ id: uid(), eventId: event.id, kind: "entry", at: Date.now(), ticketCode: code, userName: entry.userName, teamName: entry.teamName, outcome: "already-recorded", queued: false });
    return { result: "already-recorded", at: new Date(existing.at), ...(existing.local ? { by: "this device" } : {}) };
  }

  const at = Date.now();
  await markCheckedIn(event.id, entry.registrationId, at, true);
  await enqueue({
    id: uid(),
    kind: "entry",
    eventId: event.id,
    festId: entry.festId,
    registrationId: entry.registrationId,
    ticketCode: code,
    scannedAt: at,
    gate: input.gate,
    attempts: 0,
  });
  await pushHistory({ id: uid(), eventId: event.id, kind: "entry", at, ticketCode: code, userName: entry.userName, teamName: entry.teamName, outcome: "ok", queued: !input.online });

  return {
    result: "ok",
    registration: { id: entry.registrationId, userName: entry.userName, ticketCode: code, ...(entry.teamName ? { teamName: entry.teamName } : {}), memberCount: entry.memberCount },
    queued: true,
  };
};

export const decideMeal = async (input: DecideInput & { mealType: MealType; servedOn: string; post?: string }): Promise<ScanOutcome> => {
  const { event, code } = input;
  const entry = await findInRoster(event.id, code);

  if (!entry) {
    await pushHistory({ id: uid(), eventId: event.id, kind: "meal", at: Date.now(), ticketCode: code, userName: "—", outcome: "not-found", queued: false, mealType: input.mealType });
    return { result: "not-found" };
  }
  if (entry.status === "cancelled") return { result: "cancelled" };

  const served = await getServed(event.id, entry.registrationId, input.servedOn, input.mealType);
  if (served >= entry.memberCount) {
    await pushHistory({ id: uid(), eventId: event.id, kind: "meal", at: Date.now(), ticketCode: code, userName: entry.userName, teamName: entry.teamName, outcome: "already-recorded", queued: false, mealType: input.mealType });
    return { result: "already-recorded", at: new Date() };
  }

  const at = Date.now();
  const n = served + 1;
  await setServed(event.id, entry.registrationId, input.servedOn, input.mealType, n);
  await enqueue({
    id: uid(),
    kind: "meal",
    eventId: event.id,
    festId: entry.festId,
    registrationId: entry.registrationId,
    ticketCode: code,
    scannedAt: at,
    gate: input.post,
    mealType: input.mealType,
    servedOn: input.servedOn,
    serving: n,
    attempts: 0,
  });
  await pushHistory({ id: uid(), eventId: event.id, kind: "meal", at, ticketCode: code, userName: entry.userName, teamName: entry.teamName, outcome: "ok", queued: !input.online, mealType: input.mealType });

  return {
    result: "ok",
    registration: { id: entry.registrationId, userName: entry.userName, ticketCode: code, ...(entry.teamName ? { teamName: entry.teamName } : {}), memberCount: entry.memberCount },
    queued: true,
    serving: { n, of: entry.memberCount },
  };
};

/* ───────────── sync ───────────── */

let syncing: Promise<{ synced: number; failed: number }> | null = null;

/**
 * Drains the queue in order. A server "already-recorded" means another device
 * beat us to it — that is a success for the queue (the record exists) and is
 * noted in history. Network failures keep the item with a backoff counter;
 * anything else (a cancelled registration, say) is dropped after five tries
 * so one bad item cannot block the rest forever.
 */
export const syncQueue = (repos: Repositories, scannedBy: string): Promise<{ synced: number; failed: number }> => {
  if (syncing) return syncing;
  syncing = (async () => {
    let synced = 0;
    let failed = 0;
    for (const item of await listQueue()) {
      try {
        const outcome =
          item.kind === "entry"
            ? await repos.attendance.recordScan({ ticketCode: item.ticketCode, eventId: item.eventId, scannedBy, gate: item.gate, scannedAt: new Date(item.scannedAt) })
            : await repos.attendance.recordMeal({
                ticketCode: item.ticketCode,
                eventId: item.eventId,
                collectedBy: scannedBy,
                post: item.gate,
                mealType: item.mealType!,
                servedOn: item.servedOn!,
                scannedAt: new Date(item.scannedAt),
              });

        if (outcome.result === "ok" || outcome.result === "already-recorded") {
          await dequeue(item.id);
          synced += 1;
          if (item.kind === "entry" && outcome.result === "already-recorded") {
            await markCheckedIn(item.eventId, item.registrationId, outcome.at.getTime(), false);
          }
        } else {
          // Not-found / cancelled / wrong-event from the server: the roster was
          // stale. Drop it; the history already shows what this device saw.
          await dequeue(item.id);
          failed += 1;
        }
      } catch (error) {
        const transient = error instanceof RepositoryError ? error.code === "unavailable" || error.code === "unknown" : true;
        if (transient && item.attempts < 50) {
          await updateQueued({ ...item, attempts: item.attempts + 1, lastError: error instanceof Error ? error.message : String(error) });
        } else if (item.attempts >= 5) {
          await dequeue(item.id);
        } else {
          await updateQueued({ ...item, attempts: item.attempts + 1, lastError: error instanceof Error ? error.message : String(error) });
        }
        failed += 1;
        // Stop on the first network failure — the rest will fail the same way.
        if (transient) break;
      }
    }
    if (synced) await setMeta("lastSyncAt", Date.now());
    return { synced, failed };
  })().finally(() => {
    syncing = null;
  });
  return syncing;
};

/* ───────────── hook ───────────── */

export interface ScannerState {
  online: boolean;
  pending: number;
  syncing: boolean;
  lastSyncAt: Date | null;
  rosterCount: number;
  checkinCount: number;
  rosterRefreshedAt: Date | null;
  history: HistoryEntry[];
}

export const useScannerSync = (repos: Repositories, scannedBy: string | undefined, event: Event | null) => {
  const [state, setState] = React.useState<ScannerState>({
    online: true,
    pending: 0,
    syncing: false,
    lastSyncAt: null,
    rosterCount: 0,
    checkinCount: 0,
    rosterRefreshedAt: null,
    history: [],
  });

  const refreshState = React.useCallback(async () => {
    const [pending, lastSyncAt, rosterCount, checkinCount, refreshedAt, history] = await Promise.all([
      queueLength().catch(() => 0),
      getMeta<number>("lastSyncAt").catch(() => null),
      event ? rosterSize(event.id).catch(() => 0) : 0,
      event ? countCheckins(event.id).catch(() => 0) : 0,
      event ? getMeta<number>(`roster:${event.id}:refreshedAt`).catch(() => null) : null,
      listHistory(event?.id, 30).catch(() => [] as HistoryEntry[]),
    ]);
    setState((s) => ({
      ...s,
      pending,
      lastSyncAt: lastSyncAt ? new Date(lastSyncAt) : null,
      rosterCount,
      checkinCount,
      rosterRefreshedAt: refreshedAt ? new Date(refreshedAt) : null,
      history,
    }));
  }, [event]);

  const sync = React.useCallback(async () => {
    if (!scannedBy || !navigator.onLine) return;
    setState((s) => ({ ...s, syncing: true }));
    try {
      await syncQueue(repos, scannedBy);
    } finally {
      setState((s) => ({ ...s, syncing: false }));
      await refreshState();
    }
  }, [repos, scannedBy, refreshState]);

  const refreshRosterNow = React.useCallback(async () => {
    if (!event || !navigator.onLine) return;
    await refreshRoster(repos, event);
    await refreshState();
  }, [repos, event, refreshState]);

  React.useEffect(() => {
    setState((s) => ({ ...s, online: navigator.onLine }));
    const up = () => {
      setState((s) => ({ ...s, online: true }));
      void sync();
    };
    const down = () => setState((s) => ({ ...s, online: false }));
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, [sync]);

  // Refresh the roster on open and every two minutes while online; retry the
  // queue every 20 seconds while anything is pending.
  React.useEffect(() => {
    void refreshState();
    if (!event) return;
    void refreshRosterNow().then(() => sync());
    const roster = setInterval(() => void refreshRosterNow(), 120_000);
    const drain = setInterval(() => void sync(), 20_000);
    return () => {
      clearInterval(roster);
      clearInterval(drain);
    };
  }, [event, refreshRosterNow, refreshState, sync]);

  return { ...state, sync, refreshRoster: refreshRosterNow, refreshState };
};
