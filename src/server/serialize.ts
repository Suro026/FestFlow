import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";

/**
 * Admin-SDK documents to JSON the client can parse.
 *
 * Timestamps become ISO strings; the client's Zod schemas use `z.coerce.date()`
 * so they come back as Dates on the other side without a bespoke decoder.
 */
export const toJson = <T = Record<string, unknown>>(value: unknown): T => {
  if (value instanceof Timestamp) return value.toDate().toISOString() as unknown as T;
  if (value instanceof Date) return value.toISOString() as unknown as T;
  if (value === null || typeof value !== "object") return value as T;
  if (Array.isArray(value)) return value.map(toJson) as unknown as T;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = toJson(item);
  return out as T;
};

export const docToJson = <T = Record<string, unknown>>(snapshot: DocumentSnapshot): T | null =>
  snapshot.exists ? toJson<T>({ ...snapshot.data(), id: snapshot.id }) : null;

/**
 * Drops `undefined` so Firestore accepts the write.
 *
 * `FieldValue.serverTimestamp()`, `.delete()` and `.increment()` are opaque
 * sentinel objects with no enumerable properties of their own (`increment`
 * carries one, `operand`, but not the operation it names) — recursing into
 * one the way a plain nested object is recursed into does not compact it, it
 * destroys it, replacing "set this to the server's clock" with an empty
 * object literal that Firestore stores exactly as given. They are passed
 * through untouched, the same way `Date` and `Timestamp` already are.
 */
export const compact = <T extends Record<string, unknown>>(value: T): T => {
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) continue;
    out[key] =
      item !== null &&
      typeof item === "object" &&
      !Array.isArray(item) &&
      !(item instanceof Date) &&
      !(item instanceof Timestamp) &&
      !(item instanceof FieldValue)
        ? compact(item as Record<string, unknown>)
        : item;
  }
  return out as T;
};

/** Node's WebCrypto, for ticket and certificate codes. */
export const randomBytes = (size: number): Uint8Array => {
  const bytes = new Uint8Array(size);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
};
