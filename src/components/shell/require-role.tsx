"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasAtLeast, type UserRole } from "@/core/models/user";
import { useAuth } from "@/components/providers";
import { Skeleton } from "@/components/ui/primitives";

/**
 * Client-side route guard.
 *
 * Redirects to sign-in when there is no session, and to the caller's own
 * home when the role is too low. This is convenience, not security: it keeps a
 * student from landing on an admin screen full of permission errors. The data
 * itself is protected by firestore.rules and the API's `requireRole`, which do
 * not care what the URL bar says.
 */

export const homeFor = (role: UserRole): string => {
  switch (role) {
    case "super_admin":
    case "admin":
    case "organizer":
      return "/admin";
    default:
      return "/explore";
  }
};

export interface RequireRoleProps {
  minimum: UserRole;
  /** Where to send an authenticated user who lacks the role. */
  fallback?: string;
  /** Require a verified email, for actions that send mail to the address. */
  verified?: boolean;
  children: React.ReactNode;
}

export const RequireRole = ({ minimum, fallback, verified = false, children }: RequireRoleProps) => {
  const { status, session, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const allowed =
    status === "signed-in" &&
    session !== null &&
    hasAtLeast(session.role, minimum) &&
    (!verified || session.emailVerified);

  React.useEffect(() => {
    if (!ready) return;

    if (status === "signed-out") {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (session && !hasAtLeast(session.role, minimum)) {
      router.replace(fallback ?? homeFor(session.role));
      return;
    }

    if (session && verified && !session.emailVerified) {
      router.replace(`/verify-email?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, status, session, minimum, verified, fallback, pathname, router]);

  if (!ready || !allowed) return <GuardSkeleton />;

  return <>{children}</>;
};

/** A quiet placeholder while the session resolves — no spinner, no flash. */
export const GuardSkeleton = () => (
  <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-10" aria-busy>
    <Skeleton className="mb-4 h-3 w-24" />
    <Skeleton className="mb-6 h-8 w-64" />
    <div className="grid gap-4 sm:grid-cols-3">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  </div>
);
