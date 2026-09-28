"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Repositories } from "@/core/repositories";
import type { AuthService, Session } from "@/core/services/auth-service";
import type { User } from "@/core/models/user";
import { Toaster, TooltipProvider } from "@/components/ui/overlays";

/**
 * Lazy Firebase boundary.
 *
 * `data/repositories` and `data/firebase/auth-service` pull in the Firestore
 * and Auth SDKs (plus their own transitive weight — Firestore alone drags in
 * a ~230 kB parsed core) at module scope. Importing either one statically
 * here means every route in the app — including a plain `/privacy` page —
 * pays for the full Firebase client on its first-load JS, because this file
 * sits underneath the root layout.
 *
 * Every method on `Repositories` and `AuthService` is either `Promise`-based
 * or (methods named `subscribe*`, plus `onSessionChange`) returns a plain
 * synchronous unsubscribe function — a convention that holds across every
 * repository in `src/core/repositories`. `lazy()` below wraps an interface
 * of that shape so each method forwards to the real implementation once its
 * chunk has loaded, without changing what any of the ~100 call sites across
 * the app see or await. Firestore's realtime `onSnapshot` already delivers
 * its first result a beat after subscribing; this adds one more, imperceptible,
 * beat before that — nothing observable changes.
 */
type Loader<T> = () => Promise<T>;

const lazy = <T extends object>(load: Loader<T>): T => {
  const cache = new Map<PropertyKey, (...args: unknown[]) => unknown>();
  return new Proxy({} as T, {
    get(_target, prop) {
      const cached = cache.get(prop);
      if (cached) return cached;

      const name = String(prop);
      const isSubscription = name === "onSessionChange" || name.startsWith("subscribe");

      const wrapped = isSubscription
        ? (...args: unknown[]) => {
            let unsubscribe = () => {};
            let cancelled = false;
            load()
              .then((real) => {
                if (cancelled) return;
                unsubscribe = (real[prop as keyof T] as (...a: unknown[]) => () => void)(...args);
              })
              .catch((error) => {
                if (cancelled) return;
                const onError = args[args.length - 1];
                if (typeof onError === "function") onError(error);
              });
            return () => {
              cancelled = true;
              unsubscribe();
            };
          }
        : (...args: unknown[]) => load().then((real) => (real[prop as keyof T] as (...a: unknown[]) => unknown)(...args));

      cache.set(prop, wrapped);
      return wrapped;
    },
  });
};

let repositoriesPromise: Promise<Repositories> | null = null;
const loadRepositories = (): Promise<Repositories> => {
  if (!repositoriesPromise) repositoriesPromise = import("@/data/repositories").then((m) => m.repositories());
  return repositoriesPromise;
};

let authServicePromise: Promise<AuthService> | null = null;
const loadAuthService = (): Promise<AuthService> => {
  if (!authServicePromise) authServicePromise = import("@/data/firebase/auth-service").then((m) => m.authService);
  return authServicePromise;
};

/** Two levels: `Repositories` is a map of repo name to a repo object of methods. */
const lazyRepositories = (): Repositories =>
  new Proxy({} as Repositories, {
    get(_target, repoName) {
      return lazy(() => loadRepositories().then((repos) => repos[repoName as keyof Repositories]));
    },
  });

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
const AuthProvider = ({ auth, repositories, children }: { auth: AuthService; repositories: Repositories; children: React.ReactNode }) => {
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<User | null>(null);
  const [profileSettled, setProfileSettled] = React.useState(false);

  // App Check must be initialised before the first Firestore/Auth request so
  // its token rides along from the start. No-op without a site key. Lazy for
  // the same reason as the repositories/auth-service below.
  React.useEffect(() => {
    import("@/data/firebase/app-check").then((m) => m.appCheck());
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    let unsubscribe = () => {};

    loadAuthService()
      .then((real) => {
        if (cancelled) return;
        unsubscribe = real.onSessionChange((next) => {
          setSession(next);
          setStatus(next ? "signed-in" : "signed-out");
          if (!next) {
            setProfile(null);
            setProfileSettled(true);
          }
        });
      })
      .catch((error) => {
        if (cancelled) return;
        // Firebase is not configured for this deployment. Treat the visitor as
        // signed out so the public pages still render, and say why in the
        // console rather than blanking the whole app.
        console.error("[plansphere] auth unavailable:", error);
        setSession(null);
        setStatus("signed-out");
        setProfileSettled(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

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

  const repositories = React.useMemo(() => lazyRepositories(), []);
  const auth = React.useMemo(() => lazy<AuthService>(loadAuthService), []);

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoriesContext.Provider value={repositories}>
        <AuthProvider auth={auth} repositories={repositories}>
          <TooltipProvider delayDuration={300}>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </RepositoriesContext.Provider>
    </QueryClientProvider>
  );
};
