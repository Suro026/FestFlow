import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

/**
 * The client Firebase SDK.
 *
 * This is the only file in the app that calls `initializeApp`. Everything else
 * imports the instances from here, which is what keeps Fast Refresh from
 * creating a second app on every edit (`getApps()` guard) and gives the Expo
 * app in Phase 2 a single file to swap for its own initialisation.
 */

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(
      `Missing ${name}. Copy .env.example to .env.local and fill in the Firebase web config ` +
        `(Firebase console -> Project settings -> General -> Your apps).`,
    );
  }

  return value;
};

/**
 * Read eagerly rather than inside the accessor: `process.env.NEXT_PUBLIC_*` is
 * inlined at build time, so it has to be referenced as a literal property
 * access to be replaced at all.
 */
const firebaseConfig = {
  apiKey: requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY", process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: requireEnv(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  ),
  projectId: requireEnv(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  ),
  storageBucket: requireEnv(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  ),
  messagingSenderId: requireEnv(
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID", process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  ...(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID }
    : {}),
};

export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);
export const storage: FirebaseStorage = getStorage(firebaseApp);

/** Collection names, in one place so a typo is a compile error, not a silent empty query. */
export const COLLECTIONS = {
  users: "users",
  fests: "fests",
  events: "events",
  registrations: "registrations",
  attendance: "attendance",
  results: "results",
  certificates: "certificates",
  foodCollections: "foodCollections",
  notifications: "notifications",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
