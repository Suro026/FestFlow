import {
  doc,
  getCountFromServer,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type { Unsubscribe } from "@/core/models/common";
import { notificationSchema, type CreateNotification, type Notification } from "@/core/models/notification";
import type { NotificationRepository } from "@/core/repositories/notification-repository";
import { COLLECTIONS, db } from "../client";
import { guard } from "../mapping";
import { col, parseDocs, subscribeList } from "../query-helpers";

const notifications = () => col(COLLECTIONS.notifications);

export class FirestoreNotificationRepository implements NotificationRepository {
  listForUser(userId: string, limit = 30): Promise<Notification[]> {
    return guard("Loading notifications", async () => {
      const snapshot = await getDocs(
        query(notifications(), where("userId", "==", userId), orderBy("createdAt", "desc"), limitTo(limit)),
      );
      return parseDocs(notificationSchema, snapshot.docs, COLLECTIONS.notifications);
    });
  }

  subscribeForUser(userId: string, onChange: (items: Notification[]) => void, onError: (error: unknown) => void): Unsubscribe {
    return subscribeList(
      query(notifications(), where("userId", "==", userId), orderBy("createdAt", "desc"), limitTo(30)),
      notificationSchema,
      COLLECTIONS.notifications,
      onChange,
      onError,
    );
  }

  unreadCount(userId: string): Promise<number> {
    return guard("Counting notifications", async () => {
      const snapshot = await getCountFromServer(
        query(notifications(), where("userId", "==", userId), where("read", "==", false)),
      );
      return snapshot.data().count;
    });
  }

  /** Server-only. The rules deny notification creation from clients. */
  create(_input: CreateNotification): Promise<Notification> {
    void _input;
    return Promise.reject(new Error("Notifications are created server-side"));
  }

  createMany(_inputs: CreateNotification[]): Promise<number> {
    void _inputs;
    return Promise.reject(new Error("Notifications are created server-side"));
  }

  markRead(id: string): Promise<void> {
    return guard("Updating notification", async () => {
      await updateDoc(doc(notifications(), id), {
        read: true,
        readAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
  }

  markAllRead(userId: string): Promise<number> {
    return guard("Updating notifications", async () => {
      const snapshot = await getDocs(
        query(notifications(), where("userId", "==", userId), where("read", "==", false), limitTo(400)),
      );

      if (snapshot.empty) return 0;

      const batch = writeBatch(db);
      for (const item of snapshot.docs) {
        batch.update(item.ref, { read: true, readAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      await batch.commit();

      return snapshot.size;
    });
  }
}
