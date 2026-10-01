"use client";

import * as React from "react";
import Link from "next/link";
import { PublicAuthControls } from "./signed-out-only";

/**
 * The reference's actual logo mark (`.logo-mark`/`.logo-orb` in its
 * index.css, the `Logo` component in its Home.tsx) — not a redesign.
 * Reproduced here rather than reused from `WordmarkOrb` (the footer's
 * logo) because the footer renders on every public page and this task is
 * scoped to the homepage nav only; touching the shared component would
 * have changed the footer everywhere.
 *
 * The icon is the reference's literal choice — Lucide's "Orbit" icon,
 * `size={15} strokeWidth={2.2}` — fetched as the real SVG (ISC-licensed)
 * and inlined here rather than added as a new dependency: Plansphere uses
 * @phosphor-icons/react everywhere else, which has no equivalent icon, and
 * the point of this pass is pixel fidelity to the reference's actual
 * glyph, not a same-concept substitute.
 */
const OrbitIcon = ({ size = 15, strokeWidth = 2.2 }: { size?: number; strokeWidth?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85" />
    <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152" />
    <circle cx="12" cy="12" r="3" />
    <circle cx="19" cy="5" r="2" />
    <circle cx="5" cy="19" r="2" />
  </svg>
);

/** The reference's `.logo-orb`: a 28px circle rotated -15deg, with the icon
 *  counter-rotated +15deg so it stays upright. Colors follow its exact
 *  default/`.nav-scrolled` pair: ink circle + bone icon at top, mint circle
 *  + ink icon once scrolled. */
const LogoOrb = ({ inverted }: { inverted: boolean }) => (
  <span
    className={`grid h-7 w-7 flex-none place-items-center rounded-full ${inverted ? "bg-accent-fill text-text" : "bg-text text-bg"}`}
    style={{ transform: "rotate(-15deg)" }}
  >
    <span style={{ display: "grid", transform: "rotate(15deg)" }}>
      <OrbitIcon />
    </span>
  </span>
);

const NAV_LINKS: Array<{ href: string; label: string; match: "fests" | "colleges" | "verify" | "live"; hideBelow?: "sm" | "md" }> = [
  { href: "/explore", label: "Fests", match: "fests" },
  { href: "/live", label: "Live", match: "live" },
  { href: "/for-colleges", label: "For colleges", match: "colleges", hideBelow: "sm" },
  { href: "/verify", label: "Verify a certificate", match: "verify", hideBelow: "md" },
];

/**
 * The reference's actual nav mechanic (its `.minimal-nav`/`.nav-scrolled`
 * CSS plus the `window.scrollY > 65` listener in its Home.tsx): transparent
 * and in the page's ink over the hero, fixed and dark-translucent-blurred
 * once scrolled past 65px, with no transition on the swap itself — the
 * reference doesn't animate it either, only link hovers get their own
 * transition.
 *
 * This has to be a client component (the scroll listener genuinely needs
 * one), and — because a Server Component can't pass a function as children
 * across that boundary — it owns its full markup rather than taking a
 * render-prop from `PublicNav`. `PublicNav` itself stays a Server Component
 * for every page that doesn't opt into this.
 */
export const TransparentNav = ({ active }: { active?: "fests" | "colleges" | "verify" | "live" }) => {
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 65);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        scrolled
          ? "fixed inset-x-0 top-0 z-40 bg-[color-mix(in_srgb,var(--color-text)_94%,transparent)] text-bg shadow-[0_1px_0_color-mix(in_srgb,var(--color-bg)_18%,transparent)] backdrop-blur-[16px]"
          : "fixed inset-x-0 top-0 z-40 bg-transparent text-text"
      }
    >
      <nav className="nav mx-auto w-full max-w-[1180px] gap-[26px] px-[18px] py-4 sm:px-6 lg:px-10 lg:py-5" aria-label="Primary">
        <Link href="/" className="mr-auto inline-flex items-center gap-[9px] text-inherit no-underline">
          <LogoOrb inverted={scrolled} />
          <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-[-0.065em]">Plansphere</span>
        </Link>
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.match ? "page" : undefined}
            className={`text-inherit no-underline transition-colors duration-150 hover:text-accent ${
              scrolled ? "text-[color:color-mix(in_srgb,var(--color-bg)_62%,transparent)] hover:text-accent-fill" : ""
            } ${link.hideBelow === "sm" ? "hidden sm:inline" : link.hideBelow === "md" ? "hidden md:inline" : ""}`}
          >
            {link.label}
          </Link>
        ))}
        <div className="ml-3 flex items-center gap-2">
          <PublicAuthControls />
        </div>
      </nav>
    </header>
  );
};
