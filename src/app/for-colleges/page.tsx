import Link from "next/link";
import type { Metadata } from "next";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { Kick, MetaList, MetaRow, Tag, Timeline, TimelineItem } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "For colleges",
  description: "Run a fest end to end — events, teams, gate scanning, meals, results and certificates — from one admin.",
};

/**
 * The organizer-side pitch the landing page and footer link to. Static: it
 * only explains how hosting works and where to ask for an account. Accounts
 * are invite-only, so there is deliberately no self-serve sign-up form here.
 */
export default function ForCollegesPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav active="colleges" />

      <section className="mx-auto w-full max-w-[1180px] px-[18px] pb-10 pt-8 sm:px-6 sm:pt-14 lg:px-10">
        <div className="max-w-[620px]">
          <div className="mb-[18px] flex flex-wrap gap-2">
            <Tag tone="accent">For colleges</Tag>
            <Tag tone="neutral">Invite-only accounts</Tag>
          </div>
          <h1 className="mb-5 text-[40px] leading-[1] tracking-[-0.035em] sm:text-[56px]">
            Run the whole fest
            <br />
            from one place.
          </h1>
          <p className="mb-[26px] max-w-[520px] text-[16px] text-neutral-300 sm:text-[17px]">
            Events with capacity and teams, a gate that works without signal, meal counts that cannot be double-served, results that turn into verifiable
            certificates — and an audit trail behind every override.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <a href="mailto:hello@plansphere.in?subject=Hosting%20a%20fest%20on%20FestFlow" className="btn btn-primary btn-lg">
              Request an organizer account
            </a>
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
            <MetaRow label="Super admin">Creates fests and organizer accounts. FestFlow staff, or your institution’s owner account.</MetaRow>
            <MetaRow label="Admin">Runs a fest: events, registrations, results, certificates, staff roster and settings.</MetaRow>
            <MetaRow label="Organizer">The volunteer tier. Scans entry and meals at the posts they are rostered on — nothing more.</MetaRow>
            <MetaRow label="Student">Registers, holds the pass, collects certificates. Self-serve sign-up.</MetaRow>
          </MetaList>
          <div className="mt-4 max-w-[52ch] text-[12.5px] text-neutral-500">
            Staff accounts are created by invitation only. There is no public form that grants admin access, which is also why an audit log can stand
            behind every action taken on your fest.
          </div>
        </div>
        <div>
          <Kick className="mb-3">Getting started</Kick>
          <Timeline>
            <TimelineItem title={<><span className="text-neutral-500">Day 0 · </span>Write to us</>} meta="One email with the college, the fest name and dates, and who should own the account." />
            <TimelineItem title={<><span className="text-neutral-500">Day 1 · </span>Your admin account arrives</>} meta="An invitation link sets the password. The fest is created for you, unpublished, with your organization details filled in." />
            <TimelineItem title={<><span className="text-neutral-500">Same week · </span>Add events, invite staff</>} meta="Build the lineup, add co-admins and volunteers from the Staff page, and preview every event exactly as students will see it." />
            <TimelineItem title={<><span className="text-neutral-500">Launch · </span>Publish</>} meta="The fest appears on Explore and registrations open on schedule. Live counts are on your dashboard from the first sign-up." />
          </Timeline>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
