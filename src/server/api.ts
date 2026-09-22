import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { hasAtLeast, type UserRole } from "@/core/models/user";
import {
  AdminNotConfiguredError,
  COLLECTIONS,
  adminAuth,
  adminDb,
} from "./firebase-admin";
import { appCheckMode, verifyAppCheck } from "./app-check";
import { ApiError, describeError, fieldErrors, logError, toClientError } from "./errors";
import {
  accountSubject,
  clientIp,
  ipSubject,
  logRateLimited,
  rateLimitAll,
  rateLimitHeaders,
  rateLimitPolicy,
  retryMessage,
  uidSubject,
  type RateLimitRule,
} from "./rate-limit";

/**
 * Shared plumbing for the privileged API routes.
 *
 * Every route in `app/api` runs with Admin credentials, so authorisation is
 * not optional and must not be re-implemented per route. `requireRole` is the
 * single gate: it verifies the caller's Firebase ID token, confirms the
 * account is still active, and checks the role — all before the handler body
 * runs.
 */

export { ApiError, PUBLIC_MESSAGES } from "./errors";

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

/**
 * How a route is rate limited. A single rule is keyed by uid when signed in,
 * else by IP. Auth routes pass several checks — per IP and per account — and
 * the account subject usually comes out of the request body.
 */
export type RateLimitSpec =
  | RateLimitRule
  | Array<{
      rule: RateLimitRule;
      by: "ip" | "uid" | "uid-or-ip" | ((request: Request) => Promise<string | null> | string | null);
    }>
  | false;

export interface HandlerOptions {
  /**
   * Rate limiting for the route. Omitted → the tier default applies
   * (`authenticated.default` keyed by uid for signed-in calls, else
   * `public.default` keyed by IP). `false` opts out (nothing does).
   */
  rateLimit?: RateLimitSpec;
  /** Check the App Check token (monitor or enforce per APP_CHECK_ENFORCE). Default: on for POST/PATCH/DELETE. */
  appCheck?: boolean;
}

/** Reads `email` out of a JSON body without consuming it — for per-account auth limits. */
export const emailFromBody = async (request: Request): Promise<string | null> => {
  try {
    const body = (await request.clone().json()) as { email?: unknown };
    return typeof body.email === "string" && body.email.includes("@") ? accountSubject(body.email) : null;
  } catch {
    return null;
  }
};

const resolveChecks = async (spec: RateLimitSpec | undefined, request: Request, uid: string | null) => {
  if (spec === false) return [];
  const policy = rateLimitPolicy();
  if (spec === undefined) {
    return uid ? [{ rule: policy.authenticated.default, subject: uidSubject(uid) }] : [{ rule: policy.public.default, subject: ipSubject(request) }];
  }
  if (!Array.isArray(spec)) return [{ rule: spec, subject: uid ? uidSubject(uid) : ipSubject(request) }];
  const out: Array<{ rule: RateLimitRule; subject: string | null }> = [];
  for (const { rule, by } of spec) {
    const subject =
      by === "ip" ? ipSubject(request)
      : by === "uid" ? (uid ? uidSubject(uid) : null)
      : by === "uid-or-ip" ? (uid ? uidSubject(uid) : ipSubject(request))
      : await by(request);
    out.push({ rule, subject });
  }
  return out;
};



/** The uid from a bearer token without verifying it — for logs and rate-limit keys only. */
const unverifiedUid = (request: Request): string | null => {
  const header = request.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7) : "";
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { sub?: string };
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
};

/**
 * Wraps a route handler so no route has to write the same plumbing:
 *
 *  - a request id (`x-request-id`, honoured if the client sent one)
 *  - rate limiting and App Check, when asked for
 *  - one structured JSON log line per request (method, path, status, ms,
 *    uid, request id) — what Vercel's log search and alerts key on
 *  - error mapping: ApiError → its status; Admin SDK not configured → 503;
 *    transient Firestore failures → 503 with Retry-After; Zod → 400;
 *    anything else → 500, logged and reported to Sentry with the request id
 *
 * An Admin SDK stack trace can name collections, document ids and the
 * service account, none of which belongs in a client response, so the
 * 500 body is always generic and the request id is the way to find it.
 */
export const handler = (
  fn: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
  options: HandlerOptions = {},
) => {
  return async (request: Request, context: { params: Promise<Record<string, string>> }): Promise<Response> => {
    const started = Date.now();
    const requestId = request.headers.get("x-request-id")?.slice(0, 64) || randomUUID();
    const url = new URL(request.url);
    const uid = unverifiedUid(request);
    let response: Response;
    let extra: Record<string, unknown> = {};

    let budgetHeaders: Record<string, string> = {};
    const finish = (res: Response): Response => {
      res.headers.set("x-request-id", requestId);
      for (const [k, v] of Object.entries(budgetHeaders)) if (!res.headers.has(k)) res.headers.set(k, v);
      const line = { at: "api", id: requestId, method: request.method, path: url.pathname, status: res.status, ms: Date.now() - started, uid, ip: clientIp(request), ...extra };
      (res.status >= 500 ? console.error : res.status >= 400 ? console.warn : console.info)("[api]", JSON.stringify(line));
      return res;
    };

    try {
      const budget = await rateLimitAll(await resolveChecks(options.rateLimit, request, uid));
      if (budget) {
        extra = { ...extra, rl: `${budget.bucket} ${budget.remaining}/${budget.limit}` };
        budgetHeaders = rateLimitHeaders(budget);
        if (!budget.allowed) {
          logRateLimited(budget, request, requestId);
          response = NextResponse.json({ error: retryMessage(budget), code: "rate-limited", retryAfter: budget.retryAfter }, { status: 429, headers: rateLimitHeaders(budget) });
          return finish(response);
        }
      }

      const checkApp = options.appCheck ?? request.method !== "GET";
      if (checkApp) {
        const verdict = await verifyAppCheck(request);
        extra = { ...extra, appCheck: verdict };
        if (appCheckMode() === "enforced" && verdict !== "valid" && verdict !== "skipped") {
          response = NextResponse.json({ error: "This request did not come from the FestFlow app.", code: "app-check" }, { status: 401 });
          return finish(response);
        }
      }

      response = await fn(request, context);
      return finish(response);
    } catch (error) {
      const client = toClientError(error, requestId);
      extra = { ...extra, error: client.kind === "expected" ? `${client.body.code}` : describeError(error).name };
      logError(error, { requestId, method: request.method, path: url.pathname, uid, ip: clientIp(request) }, client.kind);
      return finish(NextResponse.json(client.body, { status: client.status, headers: client.headers }));
    }
  };
};

export const ok = <T>(data: T, status = 200): Response => NextResponse.json(data, { status });
