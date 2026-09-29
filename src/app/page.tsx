import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { HeroField, Kick, MetaList, MetaRow, Skeleton, Tag } from "@/components/ui/primitives";
import HomeStats from "./_home-stats";

/** The event lifecycle, in the order it actually happens. */
const LIFECYCLE = [
  { kick: "Before", title: "Register & Configure", body: "Create your event, branding, competitions, schedules and registration forms." },
  { kick: "During", title: "Run Live Operations", body: "QR gate entry, volunteer management, offline scanning and live scoring." },
  { kick: "After", title: "Results & Certificates", body: "Publish results and automatically generate verified certificates." },
] as const;

/** Who does what, top to bottom — authority flows one way. */
const ROLES = [
  { role: "Event Head", does: "Creates the event and becomes Event Super Admin." },
  { role: "Super Admin", does: "Creates Admin accounts for the event." },
  { role: "Admin", does: "Manages registrations, volunteers, results and certificates." },
  { role: "Volunteer", does: "Handles QR entry, meals and live arenas." },
  { role: "Student", does: "Explores, registers and downloads certificates." },
] as const;

export const metadata: Metadata = {
  title: "Plansphere — Create. Host. Run Every Event.",
};

// Public data; a minute of staleness is fine and keeps Firestore reads low.
export const revalidate = 60;

/** Matches HomeStats's real layout closely enough that nothing jumps when it swaps in. */
const HomeStatsFallback = () => (
  <>
    <Skeleton className="mx-auto h-20 w-full max-w-[1180px]" />
    <div className="mx-auto w-full max-w-[1180px] px-[18px] pb-5 pt-[30px] sm:px-6 lg:px-10">
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    </div>
  </>
);

/**
 * The landing page — 4a in the canvas. The one place the system allows a
 * full-bleed photograph and a headline at 76px.
 *
 * This component has no `await` of its own on purpose: it used to fetch
 * `fests` at the top before returning any JSX, which meant the *entire*
 * page — hero, H1 and all — sat behind that one Firestore call and only
 * reached the browser via `loading.tsx`'s streamed skeleton-then-swap.
 * A real Lighthouse trace confirmed the H1 as the LCP element with LCP
 * dominated by render delay, not image or font load — exactly what a
 * streamed swap looks like. The stat band and "Happening now" cards are
 * the only part that actually needs Firestore; they're isolated in
 * `HomeStats` behind their own `<Suspense>` below, so the hero renders
 * immediately as plain HTML instead of waiting on that boundary.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />

      <main id="main" className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 470 }}>
        <HeroField className="absolute inset-0 h-full w-full" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, var(--color-bg) 8%, color-mix(in srgb, var(--color-bg) 72%, transparent) 46%, transparent 88%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1180px] px-[18px] pb-14 pt-10 sm:px-6 sm:pt-16 lg:px-10">
          <div className="max-w-[620px]">
            <div className="mb-[18px] flex flex-wrap gap-2">
              <Tag tone="accent">Built for Colleges • Conferences • Sports • Festivals</Tag>
            </div>
            <h1 className="mb-5 text-[52px] leading-[0.96] tracking-[-0.04em] sm:text-[76px]">
              Create. Host.
              <br />
              Run Every Event.
            </h1>
            <p className="mb-[26px] max-w-[520px] text-[16px] text-neutral-300 sm:text-[17px]">
              Any Event Head can create an event in minutes, become its Super Admin, build their admin team, and manage
              registrations, QR entry, live operations, results and certificates from one platform.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/register-event" className="btn btn-primary btn-lg">
                Register Your Event
              </Link>
              <Link href="/explore" className="btn btn-secondary btn-lg">
                Explore Events
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* The event lifecycle */}
      <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 border-t border-divider sm:grid-cols-3">
        {LIFECYCLE.map((c, i) => (
          <div key={c.kick} className={`px-[18px] pb-[34px] pt-7 sm:px-6 lg:px-10 ${i > 0 ? "border-t border-divider sm:border-l sm:border-t-0" : ""}`}>
            <Kick className="mb-2.5">{c.kick}</Kick>
            <div className="mb-2.5 text-[22px] tracking-[-0.02em]">{c.title}</div>
            <div className="max-w-[44ch] text-[13.5px] text-neutral-300">{c.body}</div>
          </div>
        ))}
      </section>

      <Suspense fallback={<HomeStatsFallback />}>
        <HomeStats />
      </Suspense>

      {/* Who does what */}
      <section className="mx-auto mt-[34px] w-full max-w-[1180px] border-t border-divider px-[18px] pb-[34px] pt-7 sm:px-6 lg:px-10">
        <Kick className="mb-2.5">Who does what</Kick>
        <div className="mb-5 max-w-[560px] text-[22px] tracking-[-0.02em]">Authority flows one way, from the person who registered the event down.</div>
        <MetaList className="max-w-[640px] gap-1">
          {ROLES.map((r) => (
            <MetaRow key={r.role} label={r.role}>
              {r.does}
            </MetaRow>
          ))}
        </MetaList>
      </section>
      </main>

      <PublicFooter />
    </div>
  );
}
