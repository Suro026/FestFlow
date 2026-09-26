import Link from "next/link";
import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { Kick, MetaList, MetaRow, Tag, Timeline, TimelineItem } from "@/components/ui/primitives";

export const metadata: Metadata = {
  alternates: { canonical: "/for-colleges" },
  title: "For colleges",
  description: "Run a fest end to end — events, teams, gate scanning, meals, results and certificates — from one admin.",
};

/**
 * The Event Head pitch the landing page and footer link to. Registering is
 * self-service from here: `/register-event` creates the fest immediately and
 * makes the registrant its admin on the spot — no email, no waiting on
 * Plansphere. Staff beyond that first admin (more admins, volunteers) stays
 * invitation-only, issued from inside the admin console, so an audit log can
 * still stand behind every account above student.
 */
export default function ForCollegesPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav active="colleges" />

      <section className="mx-auto w-full max-w-[1180px] px-[18px] pb-10 pt-8 sm:px-6 sm:pt-14 lg:px-10">
        <div className="max-w-[620px]">
          <div className="mb-[18px] flex flex-wrap gap-2">
            <Tag tone="accent">For colleges</Tag>
            <Tag tone="neutral">Register instantly — no approval queue</Tag>
          </div>
          <h1 className="mb-5 text-[40px] leading-[1] tracking-[-0.035em] sm:text-[56px]">
            Register your event.
            <br />
            You&apos;re already in charge.
          </h1>
          <p className="mb-[26px] max-w-[520px] text-[16px] text-neutral-300 sm:text-[17px]">
            The moment you register, you&apos;re its admin — build your team, open registrations, run the gate and meals offline, and publish results that turn
            into verifiable certificates.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/register-event" className="btn btn-primary btn-lg">
              Register Your Event
            </Link>
            <Link href="/explore" className="btn btn-secondary btn-lg">
              See fests already running
            </Link>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 border-t border-divider sm:grid-cols-3">
        {[
          {
            kick: "Before the fest",
            title: "Set up in under 30 minutes",
            body: "Create the fest, add events through the wizard — solo or team, free or paid, with gates and meal slots — and publish when the lineup is ready. Registrations open and close on the dates you set.",
          },
          {
            kick: "On the day",
            title: "A gate that keeps working offline",
            body: "Volunteers scan passes from their phones. The roster is cached, duplicates are caught locally, and every scan syncs the moment the network is back — nothing is lost, nobody is let in twice.",
          },
          {
            kick: "After",
            title: "Results become certificates",
            body: "Upload results, and the system works out who is eligible from attendance. Certificates are generated, emailed, and carry a public verification link a recruiter can check in seconds.",
          },
        ].map((c, i) => (
          <div key={c.kick} className={`px-[18px] pb-[34px] pt-7 sm:px-6 lg:px-10 ${i > 0 ? "border-t border-divider sm:border-l sm:border-t-0" : ""}`}>
            <Kick className="mb-2.5">{c.kick}</Kick>
            <div className="mb-2.5 text-[22px] tracking-[-0.02em]">{c.title}</div>
            <div className="max-w-[44ch] text-[13.5px] text-neutral-300">{c.body}</div>
          </div>
        ))}
      </section>

      {/* Roles + how onboarding works */}
      <section className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-10 border-t border-divider px-[18px] py-10 sm:px-6 lg:grid-cols-2 lg:px-10">
        <div>
          <Kick className="mb-3">Who does what</Kick>
          <MetaList>
            <MetaRow label="Platform super admin">Runs Plansphere itself. Not scoped to any one event — sees the whole platform.</MetaRow>
            <MetaRow label="You, the Event Head">Register the event and you're its admin from that second — no request, no wait.</MetaRow>
            <MetaRow label="Admin(s)">Whoever you add to run it with you — Registration, Sports, Cultural, Finance, however you split it.</MetaRow>
            <MetaRow label="Volunteer(s)">Scans entry and meals, or runs the live scoreboard at the posts they're rostered on — nothing more.</MetaRow>
            <MetaRow label="Student(s)">Registers, holds the pass, collects certificates. Self-serve sign-up.</MetaRow>
          </MetaList>
          <div className="mt-4 max-w-[52ch] text-[12.5px] text-neutral-500">
            Registering is the one self-service step. Every account above it — more admins, volunteers — is invited from inside your own admin console, so
            an audit log still stands behind every action taken on your event.
          </div>
        </div>
        <div>
          <Kick className="mb-3">Getting started</Kick>
          <Timeline>
            <TimelineItem title={<><span className="text-neutral-500">Now · </span>Register your event</>} meta="Name it, pick its dates, say what it is. Takes minutes — nothing is reviewed before it goes live." />
            <TimelineItem title={<><span className="text-neutral-500">Same second · </span>You're its admin</>} meta="No invitation link to wait on. The same account that registered the event now runs it." />
            <TimelineItem title={<><span className="text-neutral-500">Same day · </span>Add events, invite your team</>} meta="Build the lineup, add other admins and volunteers from the Staff page, and preview every event exactly as students will see it." />
            <TimelineItem title={<><span className="text-neutral-500">Launch · </span>Publish</>} meta="The fest appears on Explore and registrations open on schedule. Live counts are on your dashboard from the first sign-up." />
          </Timeline>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
