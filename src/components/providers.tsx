"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Repositories } from "@/core/repositories";
import type { AuthService, Session } from "@/core/services/auth-service";
import type { User } from "@/core/models/user";
import { repositories as createRepositories } from "@/data/repositories";
import { authService as firebaseAuthService } from "@/data/firebase/auth-service";
import { Toaster, TooltipProvider } from "@/components/ui/overlays";
import { appCheck } from "@/data/firebase/app-check";

/* ───────────── repositories ───────────── */

const RepositoriesContext = React.createContext<Repositories | null>(null);

export const useRepositories = (): Repositories => {
  const value = React.useContext(RepositoriesContext);
  if (!value) throw new Error("useRepositories must be used inside <Providers>");
  return value;
};

/* ───────────── auth ───────────── */

export type AuthStatus = "loading" | "signed-out" | "signed-in";

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  /** The Firestore profile. Null while loading or when the doc is missing. */
  profile: User | null;
  /** True once both the session and the profile lookup have settled. */
  ready: boolean;
  auth: AuthService;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const value = React.useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <Providers>");
  return value;
};

/**
 * Tracks the Firebase session and the matching `users/{uid}` profile.
 *
 * Role comes from the token, never from the profile — the profile's `role` is
 * a mirror for querying. The profile is subscribed live so a name change or a
 * super admin disabling the account reaches every open tab.
 */
const AuthProvider = ({
  auth,
  repositories,
  children,
}: {
  auth: AuthService;
  repositories: Repositories;
  children: React.ReactNode;
}) => {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<User | null>(null);
  const [profileSettled, setProfileSettled] = React.useState(false);

  // App Check must be initialised before the first Firestore/Auth request so
  // its token rides along from the start. No-op without a site key.
  React.useEffect(() => {
    appCheck();
  }, []);

  React.useEffect(() => {
    try {
      return auth.onSessionChange((next) => {
        setSession(next);
        setStatus(next ? "signed-in" : "signed-out");
        if (!next) {
          setProfile(null);
          setProfileSettled(true);
        }
      });
    } catch (error) {
      // Firebase is not configured for this deployment. Treat the visitor as
      // signed out so the public pages still render, and say why in the
      // console rather than blanking the whole app.
      console.error("[festflow] auth unavailable:", error);
      setSession(null);
      setStatus("signed-out");
      setProfileSettled(true);
      return undefined;
    }
  }, [auth]);

  React.useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setProfileSettled(false);

    repositories.users
      .getById(session.uid)
      .then((user) => {
        if (cancelled) return;
        setProfile(user);
        setProfileSettled(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProfile(null);
        setProfileSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [session, repositories]);

  const refresh = React.useCallback(async () => {
    const next = await auth.refreshSession();
    setSession(next);
    if (next) setProfile(await repositories.users.getById(next.uid));
  }, [auth, repositories]);

  const signOut = React.useCallback(async () => {
    await auth.signOut();
  }, [auth]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      profile,
      ready: status !== "loading" && (status === "signed-out" || profileSettled),
      auth,
      refresh,
      signOut,
    }),
    [status, session, profile, profileSettled, auth, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/* ───────────── root ───────────── */

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Do not hammer a permission error; do retry a flaky network.
              const code = (error as { code?: string })?.code;
              if (code === "permission-denied" || code === "not-found") return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const repositories = React.useMemo(() => createRepositories(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositories}>
        <AuthProvider auth={firebaseAuthService} repositories={repositories}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
};
