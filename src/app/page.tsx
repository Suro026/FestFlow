import Link from "next/link";
import type { Metadata } from "next";
import { repositories } from "@/data/repositories";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { FestCard } from "@/components/fest/fest-card";
import { Artwork, EmptyState, Kick, Kpi, KpiStrip, Tag } from "@/components/ui/primitives";
import { formatCount } from "@/lib/utils";

export const metadata: Metadata = {
  title: "FestFlow — Every fest. One pass.",
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

  const [eventCounts, registrationCounts] = await Promise.all([
    Promise.all(fests.map((f) => repos.events.countByFest(f.id).catch(() => 0))),
    Promise.all(fests.map((f) => repos.registrations.countByFest(f.id).catch(() => 0))),
  ]);

  const totalEvents = eventCounts.reduce((a, b) => a + b, 0);
  const totalRegistrations = registrationCounts.reduce((a, b) => a + b, 0);
  const colleges = new Set(fests.map((f) => f.organizationName)).size;

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav />

      {/* Hero */}
      <section className="relative overflow-hidden" style={{ minHeight: 470 }}>
        <Artwork label="full-bleed crowd photograph, dark background · .lighten" className="absolute inset-0 items-start justify-end" />
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
              <Tag tone="accent">{colleges} {colleges === 1 ? "college" : "colleges"}</Tag>
              <Tag tone="neutral">
                {live.length} {live.length === 1 ? "fest" : "fests"} live this week
              </Tag>
            </div>
            <h1 className="mb-5 text-[52px] leading-[0.96] tracking-[-0.04em] sm:text-[76px]">
              Every fest.
              <br />
              One pass.
            </h1>
            <p className="mb-[26px] max-w-[500px] text-[16px] text-neutral-300 sm:text-[17px]">
              Find fests near you, register with your team in one go, and keep every ticket, meal slot and certificate in
              one place. Colleges run the whole thing from the other side of the same app.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/explore" className="btn btn-primary btn-lg">
                Browse fests
              </Link>
              <Link href="/for-colleges" className="btn btn-secondary btn-lg">
                Host your fest
              </Link>
            </div>
          </div>
        </div>
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
            body="When a college publishes its first fest it appears here, with live registration and check-in counts."
            action={
              <Link href="/for-colleges" className="btn btn-primary">
                Host the first one
              </Link>
            }
          />
        )}
      </section>

      {/* Two audiences */}
      <section className="mx-auto mt-[34px] grid w-full max-w-[1180px] grid-cols-1 border-t border-divider sm:grid-cols-2">
        <div className="px-[18px] pb-[34px] pt-7 sm:px-6 lg:px-10">
          <Kick className="mb-2.5">For students</Kick>
          <div className="mb-2.5 text-[22px] tracking-[-0.02em]">Register once, show a QR, done</div>
          <div className="max-w-[44ch] text-[13.5px] text-neutral-300">
            Your ticket works with no signal at the gate. Certificates are emailed and land in your account when the college
            confirms attendance, each carrying a link anyone can check.
          </div>
        </div>
        <div className="border-t border-divider px-[18px] pb-[34px] pt-7 sm:border-l sm:border-t-0 sm:px-6 lg:px-10">
          <Kick className="mb-2.5">For colleges</Kick>
          <div className="mb-2.5 text-[22px] tracking-[-0.02em]">Set up a fest in under 30 minutes</div>
          <div className="max-w-[44ch] text-[13.5px] text-neutral-300">
            Events, capacity, teams, gate scanning, meal counts and certificates in one place — with an audit log against
            every override for the institutional record.
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
