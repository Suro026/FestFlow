import type { RegistrationStatus } from "@/core/models/registration";
/**
 * The scanner's local database.
 *
 * Venue Wi-Fi collapses at peak entry — exactly when the gate matters — so
 * the scanner keeps everything it needs to decide a scan on the device:
 *
 *  roster    every registration for the event, by ticket code
 *  checkins  registration ids already checked in (server's list, plus ours)
 *  meals     `${registrationId}_${servedOn}_${mealType}` → servings so far
 *  queue     writes waiting for the network, in the order they happened
 *  history   the last scans on this device, for the volunteer's own view
 *
 * Plain IndexedDB behind a tiny promise wrapper. Each fest+event gets its
 * own key space so a volunteer moving between posts never mixes rosters.
 */

const DB_NAME = "festflow-scanner";
const DB_VERSION = 1;

export interface RosterEntry {
  ticketCode: string;
  registrationId: string;
  eventId: string;
  festId: string;
  userId: string;
  userName: string;
  userEmail: string;
  teamName?: string;
  memberCount: number;
  status: RegistrationStatus;
}

export interface QueuedScan {
  id: string;
  kind: "entry" | "meal";
  eventId: string;
  festId: string;
  registrationId: string;
  ticketCode: string;
  scannedAt: number;
  gate?: string;
  mealType?: "breakfast" | "lunch" | "dinner" | "snack";
  servedOn?: string;
  serving?: number;
  attempts: number;
  lastError?: string;
}

export interface HistoryEntry {
  id: string;
  eventId: string;
  kind: "entry" | "meal";
  at: number;
  ticketCode: string;
  userName: string;
  teamName?: string;
  outcome: "ok" | "already-recorded" | "not-found" | "cancelled" | "wrong-event";
  queued: boolean;
  mealType?: string;
}

interface CheckinRecord {
  key: string; // `${eventId}:${registrationId}`
  eventId: string;
  registrationId: string;
  at: number;
  local: boolean;
}

interface MealRecord {
  key: string; // `${eventId}:${registrationId}:${servedOn}:${mealType}`
  eventId: string;
  registrationId: string;
  servedOn: string;
  mealType: string;
  served: number;
}

const open = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this context"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("roster")) {
        const roster = db.createObjectStore("roster", { keyPath: "key" });
        roster.createIndex("byEvent", "eventId");
      }
      if (!db.objectStoreNames.contains("checkins")) {
        const c = db.createObjectStore("checkins", { keyPath: "key" });
        c.createIndex("byEvent", "eventId");
      }
      if (!db.objectStoreNames.contains("meals")) {
        const m = db.createObjectStore("meals", { keyPath: "key" });
        m.createIndex("byEvent", "eventId");
      }
      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("history")) {
        const h = db.createObjectStore("history", { keyPath: "id" });
        h.createIndex("byEvent", "eventId");
      }
      if (!db.objectStoreNames.contains("meta")) {
        db.createObjectStore("meta", { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const tx = async <T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result: T | undefined;
    const req = run(s);
    if (req) req.onsuccess = () => (result = req.result);
    t.oncomplete = () => {
      db.close();
      resolve(result as T);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
    t.onabort = () => {
      db.close();
      reject(t.error ?? new Error("aborted"));
    };
  });
};

const indexAll = async <T>(store: string, index: string, value: IDBValidKey): Promise<T[]> =>
  tx<T[]>(store, "readonly", (s) => s.index(index).getAll(value));

/* ───────────── roster ───────────── */

export const rosterKey = (eventId: string, ticketCode: string) => `${eventId}:${ticketCode.toUpperCase()}`;

export const replaceRoster = async (eventId: string, entries: RosterEntry[]): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("roster", "readwrite");
    const s = t.objectStore("roster");
    const idx = s.index("byEvent");
    const cursorReq = idx.openKeyCursor(eventId);
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        s.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        for (const e of entries) s.put({ ...e, key: rosterKey(eventId, e.ticketCode) });
      }
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
};

export const findInRoster = async (eventId: string, ticketCode: string): Promise<RosterEntry | null> => {
  const row = await tx<(RosterEntry & { key: string }) | undefined>("roster", "readonly", (s) => s.get(rosterKey(eventId, ticketCode)));
  return row ?? null;
};

/** Looks across every cached roster — for "wrong event" detection. */
export const findAnywhere = async (ticketCode: string): Promise<RosterEntry | null> => {
  const all = await tx<(RosterEntry & { key: string })[]>("roster", "readonly", (s) => s.getAll());
  return all.find((r) => r.ticketCode === ticketCode.toUpperCase()) ?? null;
};

export const rosterSize = async (eventId: string): Promise<number> => (await indexAll<RosterEntry>("roster", "byEvent", eventId)).length;

/* ───────────── check-ins ───────────── */

export const markCheckedIn = (eventId: string, registrationId: string, at: number, local: boolean) =>
  tx<IDBValidKey>("checkins", "readwrite", (s) => s.put({ key: `${eventId}:${registrationId}`, eventId, registrationId, at, local } satisfies CheckinRecord));

export const getCheckin = async (eventId: string, registrationId: string): Promise<CheckinRecord | null> =>
  (await tx<CheckinRecord | undefined>("checkins", "readonly", (s) => s.get(`${eventId}:${registrationId}`))) ?? null;

export const replaceCheckins = async (eventId: string, ids: Array<{ registrationId: string; at: number }>): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("checkins", "readwrite");
    const s = t.objectStore("checkins");
    // Keep local (unsynced) marks; replace the server-sourced ones.
    const req = s.index("byEvent").getAll(eventId);
    req.onsuccess = () => {
      for (const row of req.result as CheckinRecord[]) if (!row.local) s.delete(row.key);
      for (const { registrationId, at } of ids) s.put({ key: `${eventId}:${registrationId}`, eventId, registrationId, at, local: false } satisfies CheckinRecord);
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
};

export const countCheckins = async (eventId: string): Promise<number> => (await indexAll<CheckinRecord>("checkins", "byEvent", eventId)).length;

/* ───────────── meals ───────────── */

const mealKey = (eventId: string, registrationId: string, servedOn: string, mealType: string) => `${eventId}:${registrationId}:${servedOn}:${mealType}`;

export const getServed = async (eventId: string, registrationId: string, servedOn: string, mealType: string): Promise<number> =>
  (await tx<MealRecord | undefined>("meals", "readonly", (s) => s.get(mealKey(eventId, registrationId, servedOn, mealType))))?.served ?? 0;

export const setServed = (eventId: string, registrationId: string, servedOn: string, mealType: string, served: number) =>
  tx<IDBValidKey>("meals", "readwrite", (s) => s.put({ key: mealKey(eventId, registrationId, servedOn, mealType), eventId, registrationId, servedOn, mealType, served } satisfies MealRecord));

export const replaceMeals = async (eventId: string, rows: Array<{ registrationId: string; servedOn: string; mealType: string; served: number }>): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("meals", "readwrite");
    const s = t.objectStore("meals");
    const req = s.index("byEvent").getAll(eventId);
    req.onsuccess = () => {
      const existing = new Map((req.result as MealRecord[]).map((m) => [m.key, m]));
      for (const r of rows) {
        const key = mealKey(eventId, r.registrationId, r.servedOn, r.mealType);
        const local = existing.get(key);
        // Server count wins unless we hold unsynced local servings beyond it.
        s.put({ key, eventId, registrationId: r.registrationId, servedOn: r.servedOn, mealType: r.mealType, served: Math.max(r.served, local?.served ?? 0) } satisfies MealRecord);
      }
    };
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
};

/* ───────────── queue ───────────── */

export const enqueue = (item: QueuedScan) => tx<IDBValidKey>("queue", "readwrite", (s) => s.put(item));
export const dequeue = (id: string) => tx<undefined>("queue", "readwrite", (s) => s.delete(id));
export const updateQueued = (item: QueuedScan) => tx<IDBValidKey>("queue", "readwrite", (s) => s.put(item));
export const listQueue = async (): Promise<QueuedScan[]> => (await tx<QueuedScan[]>("queue", "readonly", (s) => s.getAll())).sort((a, b) => a.scannedAt - b.scannedAt);
export const queueLength = async (): Promise<number> => tx<number>("queue", "readonly", (s) => s.count());

/* ───────────── history ───────────── */

export const pushHistory = async (entry: HistoryEntry): Promise<void> => {
  await tx<IDBValidKey>("history", "readwrite", (s) => s.put(entry));
  // Keep the last 500 per device.
  const all = await tx<HistoryEntry[]>("history", "readonly", (s) => s.getAll());
  if (all.length > 500) {
    const stale = all.sort((a, b) => a.at - b.at).slice(0, all.length - 500);
    const db = await open();
    await new Promise<void>((resolve) => {
      const t = db.transaction("history", "readwrite");
      for (const h of stale) t.objectStore("history").delete(h.id);
      t.oncomplete = () => {
        db.close();
        resolve();
      };
    });
  }
};

export const listHistory = async (eventId?: string, limit = 50): Promise<HistoryEntry[]> => {
  const all = eventId ? await indexAll<HistoryEntry>("history", "byEvent", eventId) : await tx<HistoryEntry[]>("history", "readonly", (s) => s.getAll());
  return all.sort((a, b) => b.at - a.at).slice(0, limit);
};

/* ───────────── meta ───────────── */

export const getMeta = async <T>(key: string): Promise<T | null> =>
  (await tx<{ key: string; value: T } | undefined>("meta", "readonly", (s) => s.get(key)))?.value ?? null;

export const setMeta = <T>(key: string, value: T) => tx<IDBValidKey>("meta", "readwrite", (s) => s.put({ key, value }));
