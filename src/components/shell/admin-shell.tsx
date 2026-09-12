"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CaretDown, Check } from "@phosphor-icons/react";
import type { Fest } from "@/core/models/fest";
import { hasAtLeast } from "@/core/models/user";
import { useAuth, useRepositories } from "@/components/providers";
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from "@/components/ui/overlays";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { UserMenu } from "./user-menu";

/* ───────────── fest context ───────────── */

interface FestContextValue {
  fest: Fest;
  /** Every fest this account may manage, for the switcher. */
  fests: Fest[];
  basePath: string;
}

const FestContext = React.createContext<FestContextValue | null>(null);

export const useFest = (): FestContextValue => {
  const value = React.useContext(FestContext);
  if (!value) throw new Error("useFest must be used inside an admin fest route");
  return value;
};

/** The fests the signed-in staff member can administer. */
export const useManagedFests = () => {
  const { session } = useAuth();
  const repos = useRepositories();

  return useQuery({
    queryKey: ["managed-fests", session?.uid, session?.role, session?.festIds],
    enabled: Boolean(session),
    queryFn: async () => {
      if (!session) return [];
      if (hasAtLeast(session.role, "admin") && session.festIds.length === 0) {
        // Super admins and unscoped admins see everything.
        const page = await repos.fests.list({ limit: 200 });
        return page.items;
      }
      if (session.festIds.length === 0) return [];
      const page = await repos.fests.list({ festIds: session.festIds, limit: 200 });
      return page.items;
    },
  });
};

/**
 * Resolves `/admin/[festSlug]` and provides the fest to everything beneath.
 * Refuses (with a clear message, not a blank page) when the slug is unknown
 * or the account is not scoped to it.
 */
export const FestProvider = ({ festSlug, children }: { festSlug: string; children: React.ReactNode }) => {
  const managed = useManagedFests();

  if (managed.isPending) {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-6 py-10 lg:px-8" aria-busy>
        <Skeleton className="mb-6 h-9 w-full max-w-[720px]" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const fests = managed.data ?? [];
  const fest = fests.find((f) => f.slug === festSlug);

  if (!fest) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-6 py-16">
        <EmptyState
          title="This fest isn't in your scope"
          body={
            fests.length
              ? "Your account manages other fests. Pick one of them, or ask a super admin to add this one to your scope."
              : "Your account isn't scoped to any fest yet. Ask a super admin to assign one."
          }
          action={
            fests[0] ? (
              <Button asChild variant="primary">
                <Link href={`/admin/${fests[0].slug}/overview`}>Open {fests[0].name}</Link>
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href="/explore">Back to the student side</Link>
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    <FestContext.Provider value={{ fest, fests, basePath: `/admin/${fest.slug}` }}>{children}</FestContext.Provider>
  );
};

/* ───────────── shell ───────────── */

const NAV = [
  { seg: "overview", label: "Overview", min: "organizer" },
  { seg: "events", label: "Events", min: "organizer" },
  { seg: "registrations", label: "Registrations", min: "organizer" },
  { seg: "gate", label: "Gate", min: "organizer" },
  { seg: "certificates", label: "Certificates", min: "admin" },
  { seg: "volunteers", label: "Volunteers", min: "admin" },
  { seg: "staff", label: "Staff", min: "admin" },
  { seg: "console", label: "Console", min: "super_admin" },
] as const;

export const AdminShell = ({ children }: { children: React.ReactNode }) => {
  const { fest, fests, basePath } = useFest();
  const { session } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const roleLabel = session?.role === "super_admin" ? "SUPER ADMIN" : session?.role === "admin" ? "ADMIN" : "ORGANIZER";

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-divider">
        <nav
          className="nav mx-auto w-full max-w-[1180px] gap-6 overflow-x-auto scrollbar-none px-5 py-3.5 lg:px-8"
          aria-label="Admin"
        >
          <Brand href={`${basePath}/overview`} role={roleLabel} />
          {NAV.filter((item) => session && hasAtLeast(session.role, item.min)).map((item) => {
            const href = `${basePath}/${item.seg}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={item.seg} href={href} aria-current={active ? "page" : undefined} className="whitespace-nowrap">
                {item.label}
              </Link>
            );
          })}
          <div className="ml-3 flex flex-none items-center gap-2.5">
            <Menu>
              <MenuTrigger asChild>
                <button type="button" className="tag tag-neutral cursor-pointer gap-1.5" aria-label="Switch fest">
                  {fest.name} <CaretDown size={10} weight="bold" />
                </button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>Your fests</MenuLabel>
                {fests.map((f) => (
                  <MenuItem
                    key={f.id}
                    onSelect={() => {
                      // Keep the same section when switching fests.
                      const rest = pathname.slice(basePath.length) || "/overview";
                      const section = rest.split("/")[1] ?? "overview";
                      router.push(`/admin/${f.slug}/${section}`);
                    }}
                  >
                    <span className="w-3.5">{f.id === fest.id ? <Check size={13} /> : null}</span>
                    {f.name}
                  </MenuItem>
                ))}
                {session && hasAtLeast(session.role, "super_admin") ? (
                  <>
                    <MenuSeparator />
                    <MenuItem asChild>
                      <Link href="/admin/fests">All fests</Link>
                    </MenuItem>
                    <MenuItem asChild>
                      <Link href="/admin/fests/new">Create a fest</Link>
                    </MenuItem>
                  </>
                ) : null}
              </MenuContent>
            </Menu>
            <UserMenu variant="admin" />
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
};

/** Admin pages use a 32px gutter at desktop, per the canvas. */
export const AdminPage = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("mx-auto w-full max-w-[1180px] px-5 lg:px-8", className)}>{children}</div>
);
