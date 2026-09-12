"use client";

import Link from "next/link";
import { useAuth } from "@/components/providers";
import { UserMenu } from "./user-menu";

/** Children render only for visitors with no session. */
export const SignedOutOnly = ({ children }: { children: React.ReactNode }) => {
  const { status } = useAuth();
  return status === "signed-out" ? <>{children}</> : null;
};

/**
 * Landing-page account controls: the design's ghost "Sign in" beside an
 * outlined "Create account" when signed out, the account menu otherwise.
 */
export const PublicAuthControls = () => {
  const { status } = useAuth();

  if (status === "loading") return <div className="h-9 w-[180px]" aria-hidden />;

  if (status === "signed-out") {
    return (
      <>
        <Link href="/sign-in" className="btn btn-ghost">
          Sign in
        </Link>
        <Link href="/create-account" className="btn btn-primary">
          Create account
        </Link>
      </>
    );
  }

  return <UserMenu variant="student" />;
};
