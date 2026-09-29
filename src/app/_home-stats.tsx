import Link from "next/link";
import { repositories } from "@/data/repositories";
import { FestCard } from "@/components/fest/fest-card";
import { EmptyState, Kpi, KpiStrip } from "@/components/ui/primitives";
import { formatCount } from "@/lib/utils";

/**
 * The only part of the landing page that needs Firestore: the stat band and
 * "Happening now" cards. Split out so `page.tsx` can render the static hero
 * (the LCP element) without an `await` in its way — see page.tsx for why.
 */
export default async function HomeStats() {
  const repos = repositories();

  const fests = await repos.fests.listPublished().catch(() => []);
  const today = new Date().toISOString().slice(0, 10);
  const live = fests.filter((f) => f.startDate <= today && f.endDate >= today);
  const happening = [...live, ...fests.filter((f) => f.startDate > today)].slice(0, 3);

  const totalEvents = fests.reduce((a, f) => a + f.stats.events, 0);
  const totalRegistrations = fests.reduce((a, f) => a + f.stats.registrations, 0);
  const colleges = new Set(fests.map((f) => f.organizationName)).size;

  return (
    <>
      <KpiStrip className="mx-auto w-full max-w-[1180px]">
        <Kpi value={formatCount(colleges)} label="Colleges hosting" />
        <Kpi value={totalEvents ? `${formatCount(totalEvents)}${totalEvents >= 100 ? "+" : ""}` : "0"} label="Events run" />
        <Kpi value={formatCount(totalRegistrations)} label="Registrations" />
        <Kpi value="0" label="Spreadsheets required" />
      </KpiStrip>

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
    </>
  );
}
