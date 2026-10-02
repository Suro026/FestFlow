import { Suspense } from "react";
import type { Metadata } from "next";
import { LandingExperience, type OrbitFeature } from "./_landing/landing-experience";
import { StatementBand, PlatformSection, FlowSection, DashboardSection, EventsSection, ClosingBand } from "./_landing/sections";
import { HomeDashboard, HomeEvents } from "./_landing/home-data";
import "./landing.css";

/** Same three stages the reference's rotating hero orbit cycles through. */
const ORBIT_FEATURES: readonly OrbitFeature[] = [
  { eyebrow: "01 / CONFIGURE", title: "Register & configure", copy: "Fest setup, solo or team forms, schedules and capacity — in one flow.", icon: "✦" },
  { eyebrow: "02 / RUN LIVE", title: "Run live operations", copy: "Offline QR check-in, meal scans, volunteer shifts, and live scoring.", icon: "◌" },
  { eyebrow: "03 / CERTIFY", title: "Results & certificates", copy: "Publish results, auto-generate certificates, verify without login.", icon: "✳" },
];

export const metadata: Metadata = {
  title: "Plansphere — Make the moment matter.",
};

// Public data; a minute of staleness is fine and keeps Firestore reads low.
export const revalidate = 60;

/**
 * The landing page.
 *
 * Ported from the reference repository (github.com/Xioonnox/plansphere,
 * `client/src/pages/Home.tsx` + `index.css`) structure-for-structure, per
 * the explicit instruction that the reference is this page's UI source of
 * truth: its DOM, class names, CSS and animation mechanics are kept as
 * close to the original as the Next.js/App-Router environment allows.
 * `LandingExperience` (a client component) owns the reference's stateful
 * header/hero/command-palette/footer; everything else below the hero is
 * static or server-rendered and passed in as `children`, because the
 * reference's `quiet-mode` class (toggled from inside the header) is read
 * by CSS on sections far below the hero, so it has to live on their shared
 * ancestor — exactly where the reference puts it.
 *
 * Only demo content changed: every route, number and event below is
 * Plansphere's own. The stat band and events grid are the only part that
 * needs Firestore, so they're isolated behind their own `<Suspense>`
 * boundaries — the hero still renders immediately as plain HTML, preserving
 * the LCP fix from the previous pass.
 */
export default function LandingPage() {
  return (
    <LandingExperience features={ORBIT_FEATURES}>
      <StatementBand />
      <PlatformSection />
      <FlowSection />
      <Suspense fallback={<DashboardSection data={null} />}>
        <HomeDashboard />
      </Suspense>
      <Suspense fallback={<EventsSection fests={null} />}>
        <HomeEvents />
      </Suspense>
      <ClosingBand />
    </LandingExperience>
  );
}
