import {
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import type { Page, Unsubscribe } from "@/core/models/common";
import { eventSchema } from "@/core/models/event";
import {
  registrationSchema,
  type CreateRegistrationInput,
  type Registration,
  type RegistrationWithEvent,
} from "@/core/models/registration";
import { attendanceSchema } from "@/core/models/attendance";
import type { RegistrationQuery, RegistrationRepository } from "@/core/repositories/registration-repository";
import { api } from "@/data/api-client";
import { COLLECTIONS } from "../client";
import { guard } from "../mapping";
import { col, getManyByField, getManyById, matchesSearch, parseDoc, runPage, subscribeList } from "../query-helpers";

const registrations = () => col(COLLECTIONS.registrations);

const constraintsFor = (q: RegistrationQuery): QueryConstraint[] => {
  const out: QueryConstraint[] = [];
  if (q.eventId) out.push(where("eventId", "==", q.eventId));
  if (q.festId) out.push(where("festId", "==", q.festId));
  if (q.userId) out.push(where("userId", "==", q.userId));
  if (q.status) out.push(where("status", "==", q.status));
  out.push(orderBy("createdAt", "desc"));
  return out;
};

const applySearch = (items: Registration[], q: RegistrationQuery): Registration[] =>
  q.search
    ? items.filter((r) =>
        matchesSearch(
          [r.userName, r.userEmail, r.ticketCode, r.teamName, ...r.members.flatMap((m) => [m.name, m.email])],
          q.search,
        ),
      )
    : items;

/**
 * Registrations.
 *
 * Reads are direct and live. The three writes that change who holds a seat —
 * create, cancel, and linking a teammate's account — go through the server,
 * because each has to move the event's seat counter in the same transaction,
 * and the rules deliberately keep that counter out of any client's reach.
 */
export class FirestoreRegistrationRepository implements RegistrationRepository {
  getById(id: string): Promise<Registration | null> {
    return guard("Loading registration", async () => {
      const snapshot = await getDoc(doc(registrations(), id));
      return snapshot.exists() ? parseDoc(registrationSchema, snapshot, COLLECTIONS.registrations) : null;
    });
  }

  getByTicketCode(ticketCode: string): Promise<Registration | null> {
    return guard("Looking up ticket", async () => {
      const snapshot = await getDocs(
        query(registrations(), where("ticketCode", "==", ticketCode.trim().toUpperCase())),
      );
      const first = snapshot.docs[0];
      return first ? parseDoc(registrationSchema, first, COLLECTIONS.registrations) : null;
    });
  }

  list(q: RegistrationQuery = {}): Promise<Page<Registration>> {
    return guard("Loading registrations", async () => {
      const page = await runPage(
        query(registrations(), ...constraintsFor(q)),
        registrationSchema,
        COLLECTIONS.registrations,
        q,
      );
      page.items = applySearch(page.items, q);
      return page;
    });
  }

  listForUserWithEvents(userId: string): Promise<RegistrationWithEvent[]> {
    return guard("Loading your events", async () => {
      const snapshot = await getDocs(
        query(registrations(), where("userId", "==", userId), orderBy("createdAt", "desc")),
      );

      const mine = snapshot.docs
        .map((d) => parseDoc(registrationSchema, d, COLLECTIONS.registrations))
        .filter((r): r is Registration => r !== null);

      if (mine.length === 0) return [];

      const [events, attendance] = await Promise.all([
        getManyById(COLLECTIONS.events, mine.map((r) => r.eventId), eventSchema),
        getManyByField(COLLECTIONS.attendance, "registrationId", mine.map((r) => r.id), attendanceSchema),
      ]);

      const eventById = new Map(events.map((e) => [e.id, e]));
      const attended = new Set(attendance.map((a) => a.registrationId));

      return mine.map((registration) => {
        const event = eventById.get(registration.eventId);
        return {
          registration,
          event: event
            ? {
                id: event.id,
                title: event.title,
                date: event.date,
                startTime: event.startTime,
                venue: event.venue,
                ...(event.posterUrl ? { posterUrl: event.posterUrl } : {}),
              }
            : null,
          attended: attended.has(registration.id),
        };
      });
    });
  }

  subscribe(q: RegistrationQuery, onChange: (items: Registration[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return subscribeList(
      query(registrations(), ...constraintsFor(q)),
      registrationSchema,
      COLLECTIONS.registrations,
      (items) => onChange(applySearch(items, q)),
      onError,
    );
  }

  create(input: CreateRegistrationInput): Promise<Registration> {
    return guard("Registering", async () => {
      const result = await api<{ registration: unknown }>("/api/registrations", { method: "POST", body: input });
      const parsed = registrationSchema.safeParse(result.registration);
      if (!parsed.success) throw new Error("Server returned an unexpected registration shape");
      return parsed.data;
    });
  }

  cancel(id: string): Promise<void> {
    return guard("Cancelling registration", () =>
      api<void>(`/api/registrations/${id}/cancel`, { method: "POST" }),
    );
  }

  existsForUserAndEvent(userId: string, eventId: string): Promise<boolean> {
    return guard("Checking registration", async () => {
      const snapshot = await getCountFromServer(
        query(
          registrations(),
          where("userId", "==", userId),
          where("eventId", "==", eventId),
          where("status", "in", ["confirmed", "waitlisted"]),
        ),
      );
      return snapshot.data().count > 0;
    });
  }

  countByEvent(eventId: string): Promise<number> {
    return guard("Counting registrations", async () => {
      const snapshot = await getCountFromServer(
        query(registrations(), where("eventId", "==", eventId), where("status", "==", "confirmed")),
      );
      return snapshot.data().count;
    });
  }

  countByFest(festId: string): Promise<number> {
    return guard("Counting registrations", async () => {
      const snapshot = await getCountFromServer(
        query(registrations(), where("festId", "==", festId), where("status", "==", "confirmed")),
      );
      return snapshot.data().count;
    });
  }

  linkMemberAccountsByEmail(): Promise<number> {
    return guard("Linking your team entries", async () => {
      const result = await api<{ linked: number }>("/api/registrations/link-account", { method: "POST" });
      return result.linked;
    });
  }
}
