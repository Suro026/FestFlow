import {
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { USER_ROLES, userSchema, type UpdateUser, type User, type UserRole } from "@/core/models/user";
import type { Page, PageRequest, Unsubscribe } from "@/core/models/common";
import type { UserRepository } from "@/core/repositories/user-repository";
import { COLLECTIONS } from "../client";
import { guard, stripUndefined } from "../mapping";
import { col, getManyByField, matchesSearch, parseDoc, parseDocs, runPage, subscribeList } from "../query-helpers";

const users = () => col(COLLECTIONS.users);

export class FirestoreUserRepository implements UserRepository {
  getById(id: string): Promise<User | null> {
    return guard("Loading profile", async () => {
      const snapshot = await getDoc(doc(users(), id));
      if (!snapshot.exists()) return null;
      return parseDoc(userSchema, snapshot, COLLECTIONS.users);
    });
  }

  getByEmail(email: string): Promise<User | null> {
    return guard("Looking up account", async () => {
      const snapshot = await getDocs(query(users(), where("email", "==", email.trim().toLowerCase())));
      const first = snapshot.docs[0];
      return first ? parseDoc(userSchema, first, COLLECTIONS.users) : null;
    });
  }

  findIdsByEmails(emails: string[]): Promise<Map<string, string>> {
    return guard("Matching accounts", async () => {
      const normalised = emails.map((email) => email.trim().toLowerCase());
      const found = await getManyByField(COLLECTIONS.users, "email", normalised, userSchema);
      return new Map(found.map((user) => [user.email, user.id]));
    });
  }

  createStudentProfile(input: Parameters<UserRepository["createStudentProfile"]>[0]): Promise<User> {
    return guard("Creating profile", async () => {
      const ref = doc(users(), input.id);

      // Shape mirrors what firestore.rules allows a client to create: the id
      // equals the uid, role is exactly "student", disabled is false.
      const data = stripUndefined({
        id: input.id,
        email: input.email.trim().toLowerCase(),
        fullName: input.fullName.trim(),
        phone: input.phone,
        role: "student" as const,
        emailVerified: input.emailVerified,
        disabled: false,
        student: stripUndefined({
          studentId: input.studentId.trim(),
          college: input.college.trim(),
          department: input.department?.trim() || undefined,
          year: input.year,
        }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await setDoc(ref, data);

      const snapshot = await getDoc(ref);
      const parsed = parseDoc(userSchema, snapshot, COLLECTIONS.users);
      if (!parsed) throw new Error("Profile was written but could not be read back");
      return parsed;
    });
  }

  update(id: string, changes: UpdateUser): Promise<void> {
    return guard("Saving profile", async () => {
      const flat: Record<string, unknown> = {
        ...(changes.fullName !== undefined ? { fullName: changes.fullName.trim() } : {}),
        ...(changes.phone !== undefined ? { phone: changes.phone.trim() } : {}),
        ...(changes.photoUrl !== undefined ? { photoUrl: changes.photoUrl } : {}),
        updatedAt: serverTimestamp(),
      };

      // Dotted paths so a partial student update does not erase the rest of
      // the block.
      for (const [key, value] of Object.entries(changes.student ?? {})) {
        if (value !== undefined) flat[`student.${key}`] = value;
      }

      await updateDoc(doc(users(), id), flat);
    });
  }

  markEmailVerified(id: string): Promise<void> {
    return guard("Confirming email", async () => {
      await updateDoc(doc(users(), id), { emailVerified: true, updatedAt: serverTimestamp() });
    });
  }

  list(options: PageRequest & { role?: UserRole; festId?: string; search?: string } = {}): Promise<Page<User>> {
    return guard("Loading people", async () => {
      const constraints = [];
      if (options.role) constraints.push(where("role", "==", options.role));
      if (options.festId) constraints.push(where("organizer.festIds", "array-contains", options.festId));
      constraints.push(orderBy("createdAt", "desc"));

      const page = await runPage(query(users(), ...constraints), userSchema, COLLECTIONS.users, options);

      if (options.search) {
        page.items = page.items.filter((user) =>
          matchesSearch([user.fullName, user.email, user.student?.studentId, user.student?.college], options.search),
        );
      }

      return page;
    });
  }

  subscribeToStaff(onChange: (items: User[]) => void, onError: (error: unknown) => void): Unsubscribe {
    const staffRoles = USER_ROLES.filter((role) => role !== "student");
    return subscribeList(
      query(users(), where("role", "in", staffRoles), orderBy("createdAt", "desc")),
      userSchema,
      COLLECTIONS.users,
      onChange,
      onError,
    );
  }

  countByRole(): Promise<Record<UserRole, number>> {
    return guard("Counting accounts", async () => {
      const snapshot = await getDocs(users());
      const counts: Record<UserRole, number> = { student: 0, organizer: 0, admin: 0, super_admin: 0 };
      for (const user of parseDocs(userSchema, snapshot.docs, COLLECTIONS.users)) counts[user.role] += 1;
      return counts;
    });
  }
}
