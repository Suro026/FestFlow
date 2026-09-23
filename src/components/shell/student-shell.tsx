"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MagnifyingGlass, Ticket, UsersThree, User as UserIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Brand } from "./brand";
import { UserMenu } from "./user-menu";
import { NotificationBell } from "./notifications";

/**
 * The student side.
 *
 * Desktop: the design's top nav (Explore · My events · Teams · Certificates ·
 * account). Phone: the four-item tap bar (Explore · My pass · Teams · Profile).
 * One shell, one breakpoint, so the same page renders both without knowing.
 */

const TOP_LINKS = [
  { href: "/explore", label: "Explore", match: ["/explore", "/f/"] },
  { href: "/my-events", label: "My events", match: ["/my-events", "/my-pass", "/registered"] },
  { href: "/my-registrations", label: "Registrations", match: ["/my-registrations"] },
  { href: "/teams", label: "Teams", match: ["/teams"] },
  { href: "/certificates", label: "Certificates", match: ["/certificates"] },
];

const TAP_LINKS = [
  { href: "/explore", label: "Explore", icon: MagnifyingGlass, match: ["/explore", "/f/"] },
  { href: "/my-pass", label: "My pass", icon: Ticket, match: ["/my-pass", "/my-events", "/my-registrations", "/registered", "/certificates"] },
  { href: "/teams", label: "Teams", icon: UsersThree, match: ["/teams"] },
  { href: "/profile", label: "Profile", icon: UserIcon, match: ["/profile"] },
];

const isActive = (pathname: string, match: string[]) => match.some((m) => pathname === m || pathname.startsWith(m));

export interface StudentShellProps {
  children: React.ReactNode;
  /** Hide the tap bar (e.g. the registration success screen wants full height). */
  hideTapBar?: boolean;
  /** Extra content on the right of the desktop nav, before the account control. */
  navExtra?: React.ReactNode;
  className?: string;
}

export const StudentShell = ({ children, hideTapBar, navExtra, className }: StudentShellProps) => {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="hidden sm:block">
        <nav className="nav mx-auto w-full max-w-[1180px] gap-[26px] px-6 py-4 lg:px-10" aria-label="Primary">
          <Brand href="/" />
          {TOP_LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(pathname, link.match) ? "page" : undefined}>
              {link.label}
            </Link>
          ))}
          {navExtra}
          <div className="ml-3 flex items-center gap-1.5">
            <NotificationBell />
            <UserMenu variant="student" />
          </div>
        </nav>
      </header>

      <main id="main" className={cn("flex-1", !hideTapBar && "pb-[76px] sm:pb-0", className)}>{children}</main>

      {hideTapBar ? null : (
        <nav className="tapbar fixed inset-x-0 bottom-0 z-40 sm:hidden" aria-label="Primary">
          {TAP_LINKS.map((link) => {
            const Icon = link.icon;
            const active = isActive(pathname, link.match);
            return (
              <Link key={link.href} href={link.href} className="tapitem" aria-current={active ? "page" : undefined}>
                <span className="tapdot">
                  <Icon size={19} weight={active ? "fill" : "regular"} />
                </span>
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
};

/** Consistent page gutter: 18px on a phone (the design's), 40px on desktop. */
export const Page = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("mx-auto w-full max-w-[1180px] px-[18px] sm:px-6 lg:px-10", className)}>{children}</div>
);
