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
  documentId,
  type QueryConstraint,
} from "firebase/firestore";
import { RepositoryError, type Page, type Unsubscribe } from "@/core/models/common";
import { festSchema, type CreateFest, type Fest, type FestStatus, type UpdateFest } from "@/core/models/fest";
import type { FestQuery, FestRepository } from "@/core/repositories/fest-repository";
import { api } from "@/data/api-client";
import { COLLECTIONS } from "../client";
import { guard, stripUndefined, toRepositoryError } from "../mapping";
import { col, parseDoc, parseDocs, runPage, subscribeList } from "../query-helpers";

const fests = () => col(COLLECTIONS.fests);

const constraintsFor = (q: FestQuery): QueryConstraint[] => {
  const out: QueryConstraint[] = [];

  if (q.festIds && q.festIds.length > 0) {
    out.push(where(documentId(), "in", q.festIds.slice(0, 30)));
  } else if (q.status) {
    out.push(Array.isArray(q.status) ? where("status", "in", q.status) : where("status", "==", q.status));
  }

  out.push(orderBy("startDate", "asc"));
  return out;
};

export class FirestoreFestRepository implements FestRepository {
  getById(id: string): Promise<Fest | null> {
    return guard("Loading fest", async () => {
      const snapshot = await getDoc(doc(fests(), id));
      return snapshot.exists() ? parseDoc(festSchema, snapshot, COLLECTIONS.fests) : null;
    });
  }

  getBySlug(slug: string): Promise<Fest | null> {
    return guard("Loading fest", async () => {
      const snapshot = await getDocs(query(fests(), where("slug", "==", slug.toLowerCase())));
      const first = snapshot.docs[0];
      return first ? parseDoc(festSchema, first, COLLECTIONS.fests) : null;
    });
  }

  subscribeById(id: string, onChange: (fest: Fest | null) => void, onError: (error: unknown) => void): Unsubscribe {
    return onSnapshot(
      doc(fests(), id),
      (snapshot) => onChange(snapshot.exists() ? parseDoc(festSchema, snapshot, COLLECTIONS.fests) : null),
      (error) => onError(toRepositoryError(error, "Listening to fest")),
    );
  }

  list(q: FestQuery = {}): Promise<Page<Fest>> {
    return guard("Loading fests", () => runPage(query(fests(), ...constraintsFor(q)), festSchema, COLLECTIONS.fests, q));
  }

  listPublished(): Promise<Fest[]> {
    return guard("Loading fests", async () => {
      const snapshot = await getDocs(query(fests(), where("status", "==", "published"), orderBy("startDate", "asc")));
      return parseDocs(festSchema, snapshot.docs, COLLECTIONS.fests);
    });
  }

  subscribe(q: FestQuery, onChange: (fests: Fest[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return subscribeList(query(fests(), ...constraintsFor(q)), festSchema, COLLECTIONS.fests, onChange, onError);
  }

  create(input: CreateFest, createdBy: string): Promise<Fest> {
    return guard("Creating fest", async () => {
      if (!(await this.isSlugAvailable(input.slug))) {
        throw new RepositoryError("already-exists", `The address "${input.slug}" is already taken.`);
      }

      const ref = await addDoc(
        fests(),
        stripUndefined({
          ...input,
          status: "draft",
          createdBy,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }),
      );

      const created = await getDoc(ref);
      const parsed = parseDoc(festSchema, created, COLLECTIONS.fests);
      if (!parsed) throw new Error("Fest was written but could not be read back");
      return parsed;
    });
  }

  update(id: string, changes: UpdateFest): Promise<void> {
    return guard("Saving fest", async () => {
      await updateDoc(doc(fests(), id), stripUndefined({ ...changes, updatedAt: serverTimestamp() }));
    });
  }

  setStatus(id: string, status: FestStatus): Promise<void> {
    return guard("Updating fest", async () => {
      await updateDoc(doc(fests(), id), { status, updatedAt: serverTimestamp() });
    });
  }

  /** Server-side: refuses while events still exist under the fest. */
  delete(id: string): Promise<void> {
    return guard("Deleting fest", () => api<void>(`/api/admin/fests/${id}`, { method: "DELETE" }));
  }

  isSlugAvailable(slug: string): Promise<boolean> {
    return guard("Checking address", async () => {
      const snapshot = await getCountFromServer(query(fests(), where("slug", "==", slug.toLowerCase())));
      return snapshot.data().count === 0;
    });
  }
}
