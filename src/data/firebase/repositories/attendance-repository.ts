import {
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { auth, db } from "../client";
import type { Unsubscribe } from "@/core/models/common";
import {
  attendanceIdFor,
  attendanceSchema,
  foodCollectionIdFor,
  foodCollectionSchema,
  type Attendance,
  type FoodCollection,
  type MealType,
  type ScanOutcome,
} from "@/core/models/attendance";
import { registrationSchema, type Registration } from "@/core/models/registration";
import { eventSchema } from "@/core/models/event";
import type { AttendanceRepository } from "@/core/repositories/attendance-repository";
import { api } from "@/data/api-client";
import { COLLECTIONS } from "../client";
import { guard, stripUndefined, toRepositoryError } from "../mapping";
import { col, parseDoc, parseDocs, subscribeList } from "../query-helpers";

const attendance = () => col(COLLECTIONS.attendance);
const meals = () => col(COLLECTIONS.foodCollections);
const registrations = () => col(COLLECTIONS.registrations);

/** Resolves a scanned code to its registration, or the reason it cannot be. */
const resolveTicket = async (
  ticketCode: string,
  eventId: string,
): Promise<{ ok: true; registration: Registration } | { ok: false; outcome: ScanOutcome }> => {
  const code = ticketCode.trim().toUpperCase();
  const snapshot = await getDocs(query(registrations(), where("ticketCode", "==", code)));
  const first = snapshot.docs[0];
  const registration = first ? parseDoc(registrationSchema, first, COLLECTIONS.registrations) : null;

  if (!registration) return { ok: false, outcome: { result: "not-found" } };

  if (registration.eventId !== eventId) {
    const other = await getDoc(doc(col(COLLECTIONS.events), registration.eventId));
    const parsed = other.exists() ? parseDoc(eventSchema, other, COLLECTIONS.events) : null;
    return {
      ok: false,
      outcome: { result: "wrong-event", expectedEventTitle: parsed?.title ?? registration.eventTitle },
    };
  }

  if (registration.status === "cancelled") return { ok: false, outcome: { result: "cancelled" } };

  return { ok: true, registration };
};

export class FirestoreAttendanceRepository implements AttendanceRepository {
  /**
   * Check-in.
   *
   * The attendance document id *is* the registration id, and the write is a
   * transaction that creates only if absent. Two volunteers scanning the same
   * ticket in the same second therefore cannot both succeed: the second sees
   * the first's record and reports "already checked in" with its timestamp.
   * Firestore rules back this up by denying updates to attendance documents.
   *
   * Manual (non-QR) entry is an admin action and goes through the server so
   * it lands in the audit log; volunteers cannot mark it from here.
   */
  recordScan(input: { ticketCode: string; eventId: string; scannedBy: string; method?: "qr" | "manual"; gate?: string }): Promise<ScanOutcome> {
    return guard("Recording check-in", async () => {
      if (input.method === "manual") {
        return api<ScanOutcome>("/api/admin/attendance/manual", {
          method: "POST",
          body: { ticketCode: input.ticketCode, eventId: input.eventId, gate: input.gate },
        });
      }

      const resolved = await resolveTicket(input.ticketCode, input.eventId);
      if (!resolved.ok) return resolved.outcome;

      const { registration } = resolved;
      const ref = doc(attendance(), attendanceIdFor(registration.id));

      try {
        return await runTransaction(db, async (tx) => {
          const existing = await tx.get(ref);

          if (existing.exists()) {
            const record = parseDoc(attendanceSchema, existing, COLLECTIONS.attendance);
            return {
              result: "already-recorded",
              at: record?.scannedAt ?? new Date(),
              ...(record?.scannedByName ? { by: record.scannedByName } : {}),
            } satisfies ScanOutcome;
          }

          tx.set(
            ref,
            stripUndefined({
              id: ref.id,
              registrationId: registration.id,
              eventId: registration.eventId,
              festId: registration.festId,
              userId: registration.userId,
              userName: registration.userName,
              userEmail: registration.userEmail,
              ticketCode: registration.ticketCode,
              teamName: registration.teamName,
              method: "qr",
              gate: input.gate,
              scannedAt: serverTimestamp(),
              scannedBy: input.scannedBy,
              scannedByName: auth.currentUser?.displayName ?? undefined,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          );

          return {
            result: "ok",
            registration: {
              id: registration.id,
              userName: registration.userName,
              ticketCode: registration.ticketCode,
              ...(registration.teamName ? { teamName: registration.teamName } : {}),
              memberCount: registration.members.length,
            },
          } satisfies ScanOutcome;
        });
      } catch (error) {
        throw toRepositoryError(error, "Recording check-in");
      }
    });
  }

  getByRegistration(registrationId: string): Promise<Attendance | null> {
    return guard("Loading check-in", async () => {
      const snapshot = await getDoc(doc(attendance(), attendanceIdFor(registrationId)));
      return snapshot.exists() ? parseDoc(attendanceSchema, snapshot, COLLECTIONS.attendance) : null;
    });
  }

  listByEvent(eventId: string): Promise<Attendance[]> {
    return guard("Loading check-ins", async () => {
      const snapshot = await getDocs(query(attendance(), where("eventId", "==", eventId), orderBy("scannedAt", "desc")));
      return parseDocs(attendanceSchema, snapshot.docs, COLLECTIONS.attendance);
    });
  }

  attendedRegistrationIds(eventId: string): Promise<Set<string>> {
    return guard("Loading check-ins", async () => {
      const snapshot = await getDocs(query(attendance(), where("eventId", "==", eventId)));
      return new Set(snapshot.docs.map((d) => d.id));
    });
  }

  subscribeByEvent(eventId: string, onChange: (records: Attendance[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return subscribeList(
      query(attendance(), where("eventId", "==", eventId), orderBy("scannedAt", "desc")),
      attendanceSchema,
      COLLECTIONS.attendance,
      onChange,
      onError,
    );
  }

  subscribeByFest(festId: string, onChange: (records: Attendance[]) => void, onError: (error: unknown) => void, limit = 50): Unsubscribe {
    const constraints: QueryConstraint[] = [where("festId", "==", festId), orderBy("scannedAt", "desc")];
    void limit;
    return subscribeList(query(attendance(), ...constraints), attendanceSchema, COLLECTIONS.attendance, onChange, onError);
  }

  countByEvent(eventId: string): Promise<number> {
    return guard("Counting check-ins", async () => {
      const snapshot = await getCountFromServer(query(attendance(), where("eventId", "==", eventId)));
      return snapshot.data().count;
    });
  }

  countByFest(festId: string): Promise<number> {
    return guard("Counting check-ins", async () => {
      const snapshot = await getCountFromServer(query(attendance(), where("festId", "==", festId)));
      return snapshot.data().count;
    });
  }

  remove(registrationId: string): Promise<void> {
    return guard("Removing check-in", async () => {
      await deleteDoc(doc(attendance(), attendanceIdFor(registrationId)));
    });
  }

  /** Same shape as `recordScan`, keyed by entry + day + slot. */
  recordMeal(input: { ticketCode: string; eventId: string; mealType: MealType; servedOn: string; collectedBy: string; post?: string }): Promise<ScanOutcome> {
    return guard("Recording meal", async () => {
      const resolved = await resolveTicket(input.ticketCode, input.eventId);
      if (!resolved.ok) return resolved.outcome;

      const { registration } = resolved;
      const ref = doc(meals(), foodCollectionIdFor(registration.id, input.servedOn, input.mealType));

      try {
        return await runTransaction(db, async (tx) => {
          const existing = await tx.get(ref);

          if (existing.exists()) {
            const record = parseDoc(foodCollectionSchema, existing, COLLECTIONS.foodCollections);
            return {
              result: "already-recorded",
              at: record?.collectedAt ?? new Date(),
              ...(record?.collectedByName ? { by: record.collectedByName } : {}),
            } satisfies ScanOutcome;
          }

          tx.set(
            ref,
            stripUndefined({
              id: ref.id,
              registrationId: registration.id,
              eventId: registration.eventId,
              festId: registration.festId,
              userId: registration.userId,
              userName: registration.userName,
              ticketCode: registration.ticketCode,
              teamName: registration.teamName,
              mealType: input.mealType,
              servedOn: input.servedOn,
              post: input.post,
              collectedAt: serverTimestamp(),
              collectedBy: input.collectedBy,
              collectedByName: auth.currentUser?.displayName ?? undefined,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }),
          );

          return {
            result: "ok",
            registration: {
              id: registration.id,
              userName: registration.userName,
              ticketCode: registration.ticketCode,
              ...(registration.teamName ? { teamName: registration.teamName } : {}),
              memberCount: registration.members.length,
            },
          } satisfies ScanOutcome;
        });
      } catch (error) {
        throw toRepositoryError(error, "Recording meal");
      }
    });
  }

  listMealsByEvent(eventId: string, servedOn?: string): Promise<FoodCollection[]> {
    return guard("Loading meals", async () => {
      const constraints: QueryConstraint[] = [where("eventId", "==", eventId)];
      if (servedOn) constraints.push(where("servedOn", "==", servedOn));
      constraints.push(orderBy("collectedAt", "desc"));
      const snapshot = await getDocs(query(meals(), ...constraints));
      return parseDocs(foodCollectionSchema, snapshot.docs, COLLECTIONS.foodCollections);
    });
  }

  countMeals(eventId: string, servedOn?: string, mealType?: MealType): Promise<number> {
    return guard("Counting meals", async () => {
      const constraints: QueryConstraint[] = [where("eventId", "==", eventId)];
      if (servedOn) constraints.push(where("servedOn", "==", servedOn));
      if (mealType) constraints.push(where("mealType", "==", mealType));
      const snapshot = await getCountFromServer(query(meals(), ...constraints));
      return snapshot.data().count;
    });
  }

  countMealsByFest(festId: string): Promise<number> {
    return guard("Counting meals", async () => {
      const snapshot = await getCountFromServer(query(meals(), where("festId", "==", festId)));
      return snapshot.data().count;
    });
  }
}
