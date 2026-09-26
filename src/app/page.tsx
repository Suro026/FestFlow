import Link from "next/link";
import type { Metadata } from "next";
import { repositories } from "@/data/repositories";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { FestCard } from "@/components/fest/fest-card";
import { EmptyState, HeroField, Kick, Kpi, KpiStrip, MetaList, MetaRow, Tag } from "@/components/ui/primitives";
import { formatCount } from "@/lib/utils";

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

/**
 * The landing page — 4a in the canvas. The one place the system allows a
 * full-bleed photograph and a headline at 76px.
 */
export default async function LandingPage() {
  const repos = repositories();

  const fests = await repos.fests.listPublished().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const live = fests.filter((f) => f.startDate <= today && f.endDate >= today);
  const happening = [...live, ...fests.filter((f) => f.startDate > today)].slice(0, 3);

  const totalEvents = fests.reduce((a, f) => a + f.stats.events, 0);
  const totalRegistrations = fests.reduce((a, f) => a + f.stats.registrations, 0);
  const colleges = new Set(fests.map((f) => f.organizationName)).size;

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

      {/* Stat band */}
      <KpiStrip className="mx-auto w-full max-w-[1180px]">
        <Kpi value={formatCount(colleges)} label="Colleges hosting" />
        <Kpi value={totalEvents ? `${formatCount(totalEvents)}${totalEvents >= 100 ? "+" : ""}` : "0"} label="Events run" />
        <Kpi value={formatCount(totalRegistrations)} label="Registrations" />
        <Kpi value="0" label="Spreadsheets required" />
      </KpiStrip>

      {/* Happening now */}
      <section className="mx-auto w-full max-w-[1180px] px-[18px] pb-5 pt-[30px] sm:px-6 lg:px-10">
        <div className="mb-4 flex items-center justify-between">
          <h4>Happening now</h4>
          <Link href="/explore" className="btn btn-ghost">
            See all {fests.length}
          </Link>
        </div>
        {happening.length ? (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {happening.map((fest) => (
              <FestCard key={fest.id} fest={fest} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No fests published yet"
            body="When an Event Head registers the first one it appears here, with live registration and check-in counts."
            action={
              <Link href="/register-event" className="btn btn-primary">
                Register the first one
              </Link>
            }
          />
        )}
      </section>

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
