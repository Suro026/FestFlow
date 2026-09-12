import {
  addDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { RepositoryError, type Page, type Unsubscribe } from "@/core/models/common";
import {
  eventSchema,
  isRegistrationOpen,
  type CreateEvent,
  type Event,
  type EventStatus,
} from "@/core/models/event";
import type { EventQuery, EventRepository } from "@/core/repositories/event-repository";
import { api } from "@/data/api-client";
import { COLLECTIONS } from "../client";
import { guard, stripUndefined, toRepositoryError } from "../mapping";
import { col, getManyById, parseDoc, parseDocs, runPage, subscribeList } from "../query-helpers";

const events = () => col(COLLECTIONS.events);

const constraintsFor = (q: EventQuery): QueryConstraint[] => {
  const out: QueryConstraint[] = [];
  if (q.festId) out.push(where("festId", "==", q.festId));
  if (q.status) {
    out.push(Array.isArray(q.status) ? where("status", "in", q.status) : where("status", "==", q.status));
  }
  if (q.category) out.push(where("category", "==", q.category));
  if (q.fromDate) out.push(where("date", ">=", q.fromDate));
  out.push(orderBy("date", "asc"), orderBy("startTime", "asc"));
  return out;
};

/** `openOnly` depends on the clock and the counter, so it is applied in memory. */
const applyOpenOnly = (items: Event[], q: EventQuery): Event[] =>
  q.openOnly ? items.filter((event) => isRegistrationOpen(event)) : items;

export class FirestoreEventRepository implements EventRepository {
  getById(id: string): Promise<Event | null> {
    return guard("Loading event", async () => {
      const snapshot = await getDoc(doc(events(), id));
      return snapshot.exists() ? parseDoc(eventSchema, snapshot, COLLECTIONS.events) : null;
    });
  }

  getBySlug(festId: string, slug: string): Promise<Event | null> {
    return guard("Loading event", async () => {
      const snapshot = await getDocs(
        query(events(), where("festId", "==", festId), where("slug", "==", slug.toLowerCase())),
      );
      const first = snapshot.docs[0];
      return first ? parseDoc(eventSchema, first, COLLECTIONS.events) : null;
    });
  }

  subscribeById(id: string, onChange: (event: Event | null) => void, onError: (error: unknown) => void): Unsubscribe {
    return onSnapshot(
      doc(events(), id),
      (snapshot) => onChange(snapshot.exists() ? parseDoc(eventSchema, snapshot, COLLECTIONS.events) : null),
      (error) => onError(toRepositoryError(error, "Listening to event")),
    );
  }

  getManyByIds(ids: string[]): Promise<Event[]> {
    return guard("Loading events", () => getManyById(COLLECTIONS.events, ids, eventSchema));
  }

  list(q: EventQuery = {}): Promise<Page<Event>> {
    return guard("Loading events", async () => {
      const page = await runPage(query(events(), ...constraintsFor(q)), eventSchema, COLLECTIONS.events, q);
      page.items = applyOpenOnly(page.items, q);
      return page;
    });
  }

  subscribe(q: EventQuery, onChange: (events: Event[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return subscribeList(
      query(events(), ...constraintsFor(q)),
      eventSchema,
      COLLECTIONS.events,
      (items) => onChange(applyOpenOnly(items, q)),
      onError,
    );
  }

  create(input: CreateEvent, createdBy: string): Promise<Event> {
    return guard("Creating event", async () => {
      if (!(await this.isSlugAvailable(input.festId, input.slug))) {
        throw new RepositoryError("already-exists", `An event at "${input.slug}" already exists in this fest.`);
      }

      const ref = await addDoc(
        events(),
        stripUndefined({
          ...input,
          registeredCount: 0,
          createdBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );

      const created = await getDoc(ref);
      const parsed = parseDoc(eventSchema, created, COLLECTIONS.events);
      if (!parsed) throw new Error("Event was written but could not be read back");
      return parsed;
    });
  }

  update(id: string, changes: Partial<CreateEvent>): Promise<void> {
    return guard("Saving event", async () => {
      // `registeredCount` and `festId` are excluded by the rules; strip them
      // here too so an accidental spread does not turn into a denied write.
      const { festId: _festId, ...rest } = changes as Partial<CreateEvent> & { festId?: string };
      void _festId;
      await updateDoc(doc(events(), id), stripUndefined({ ...rest, updatedAt: serverTimestamp() }));
    });
  }

  /** Server-side: refuses while registrations exist. */
  delete(id: string): Promise<void> {
    return guard("Deleting event", () => api<void>(`/api/admin/events/${id}`, { method: "DELETE" }));
  }

  setStatus(id: string, status: EventStatus): Promise<void> {
    return guard("Updating event", async () => {
      await updateDoc(doc(events(), id), { status, updatedAt: serverTimestamp() });
    });
  }

  setRegistrationOpen(id: string, open: boolean): Promise<void> {
    return guard("Updating event", async () => {
      await updateDoc(doc(events(), id), { registrationOpen: open, updatedAt: serverTimestamp() });
    });
  }

  countByFest(festId: string): Promise<number> {
    return guard("Counting events", async () => {
      const snapshot = await getCountFromServer(query(events(), where("festId", "==", festId)));
      return snapshot.data().count;
    });
  }

  isSlugAvailable(festId: string, slug: string, excludingEventId?: string): Promise<boolean> {
    return guard("Checking address", async () => {
      const snapshot = await getDocs(
        query(events(), where("festId", "==", festId), where("slug", "==", slug.toLowerCase())),
      );
      return parseDocs(eventSchema, snapshot.docs, COLLECTIONS.events).every((event) => event.id === excludingEventId);
    });
  }
}
