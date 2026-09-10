import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { hasAtLeast, type UserRole } from "@/core/models/user";
import {
  AdminNotConfiguredError,
  COLLECTIONS,
  adminAuth,
  adminDb,
} from "./firebase-admin";

/**
 * Shared plumbing for the privileged API routes.
 *
 * Every route in `app/api` runs with Admin credentials, so authorisation is
 * not optional and must not be re-implemented per route. `requireRole` is the
 * single gate: it verifies the caller's Firebase ID token, confirms the
 * account is still active, and checks the role — all before the handler body
 * runs.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static unauthorized(message = "Sign in to continue.") {
    return new ApiError(401, "unauthenticated", message);
  }

  static forbidden(message = "You do not have permission to do that.") {
    return new ApiError(403, "forbidden", message);
  }

  static notFound(message = "Not found.") {
    return new ApiError(404, "not-found", message);
  }

  static conflict(message: string) {
    return new ApiError(409, "conflict", message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "bad-request", message, details);
  }

  static unprocessable(message: string) {
    return new ApiError(422, "unprocessable", message);
  }
}

export interface Caller {
  uid: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  festIds: string[];
}

/**
 * Resolves the caller from the `Authorization: Bearer <idToken>` header.
 *
 * `checkRevoked` is on deliberately. It costs an extra lookup, but without it
 * a token stays usable for up to an hour after a super admin disables the
 * account — which is exactly the window in which someone would be trying to
 * use it.
 */
export const authenticate = async (request: Request): Promise<Caller> => {
  const header = request.headers.get("authorization") ?? "";

  if (!header.toLowerCase().startsWith("bearer ")) {
    throw ApiError.unauthorized();
  }

  const token = header.slice(7).trim();

  if (!token) throw ApiError.unauthorized();

  let decoded;

  try {
    decoded = await adminAuth().verifyIdToken(token, true);
  } catch (error) {
    if (error instanceof AdminNotConfiguredError) throw error;
    // Expired, malformed, revoked, or issued by a different project.
    throw ApiError.unauthorized("Your session has expired. Sign in again.");
  }

  // The token's `role` claim is authoritative, but a disabled account must be
  // shut out immediately, so the user document is read on every privileged
  // call rather than trusting the claim alone.
  const snapshot = await adminDb().collection(COLLECTIONS.users).doc(decoded.uid).get();

  if (!snapshot.exists) {
    throw ApiError.forbidden("Your account is not set up. Contact an organizer.");
  }

  const data = snapshot.data() ?? {};

  if (data.disabled === true) {
    throw ApiError.forbidden("This account has been disabled.");
  }

  const claimRole = typeof decoded.role === "string" ? (decoded.role as UserRole) : undefined;
  const docRole = typeof data.role === "string" ? (data.role as UserRole) : undefined;

  // If the two disagree, take the weaker of them. A mirror that drifted must
  // never be able to grant more than the token does, and vice versa.
  const role: UserRole =
    claimRole && docRole
      ? hasAtLeast(claimRole, docRole)
        ? docRole
        : claimRole
      : (claimRole ?? docRole ?? "student");

  const festIds = Array.isArray(decoded.festIds)
    ? (decoded.festIds as unknown[]).filter((id): id is string => typeof id === "string")
    : Array.isArray(data.organizer?.festIds)
      ? (data.organizer.festIds as unknown[]).filter((id): id is string => typeof id === "string")
      : [];

  return {
    uid: decoded.uid,
    email: (decoded.email ?? data.email ?? "").toLowerCase(),
    emailVerified: decoded.email_verified === true,
    role,
    festIds,
  };
};

/** Authenticates, then enforces a minimum role. */
export const requireRole = async (request: Request, minimum: UserRole): Promise<Caller> => {
  const caller = await authenticate(request);

  if (!hasAtLeast(caller.role, minimum)) {
    throw ApiError.forbidden();
  }

  return caller;
};

/**
 * True when the caller may act on this fest. Admins and super admins are
 * unscoped; an organizer is limited to the fests assigned to them.
 */
export const canManageFest = (caller: Caller, festId: string): boolean => {
  if (hasAtLeast(caller.role, "admin")) return true;
  return caller.role === "organizer" && caller.festIds.includes(festId);
};

export const requireFestAccess = (caller: Caller, festId: string): void => {
  if (!canManageFest(caller, festId)) {
    throw ApiError.forbidden("You do not manage this fest.");
  }
};

/** Parses and validates a JSON body, turning Zod issues into a 400. */
export const readBody = async <T>(request: Request, schema: ZodType<T>): Promise<T> => {
  let raw: unknown;

  try {
    raw = await request.json();
  } catch {
    throw ApiError.badRequest("Expected a JSON body.");
  }

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    throw ApiError.badRequest("Some fields need fixing.", fieldErrors(parsed.error));
  }

  return parsed.data;
};

/** Flattens Zod issues into `{ field: message }` for the form to display. */
export const fieldErrors = (error: ZodError): Record<string, string> => {
  const out: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join(".") || "_";
    if (!out[path]) out[path] = issue.message;
  }

  return out;
};

/**
 * Wraps a handler so no route has to write the same try/catch.
 *
 * Unexpected errors are logged server-side and answered with a generic 500:
 * an Admin SDK stack trace can name collections, document ids and the service
 * account, none of which belongs in a client response.
 */
export const handler = (
  fn: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
) => {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ): Promise<Response> => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code, ...(error.details ? { details: error.details } : {}) },
          { status: error.status },
        );
      }

      if (error instanceof AdminNotConfiguredError) {
        console.error("[api] admin not configured:", error.message);
        return NextResponse.json(
          {
            error:
              "The server is not configured to perform this action. " +
              "FIREBASE_SERVICE_ACCOUNT is missing or invalid.",
            code: "not-configured",
          },
          { status: 503 },
        );
      }

      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: "Some fields need fixing.", code: "bad-request", details: fieldErrors(error) },
          { status: 400 },
        );
      }

      console.error("[api] unhandled error:", error);

      return NextResponse.json(
        { error: "Something went wrong. Please try again.", code: "internal" },
        { status: 500 },
      );
    }
  };
};

export const ok = <T>(data: T, status = 200): Response => NextResponse.json(data, { status });
