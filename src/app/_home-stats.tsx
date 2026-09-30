import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { repositories } from "@/data/repositories";
import { FestCard } from "@/components/fest/fest-card";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { formatCount } from "@/lib/utils";

/** Matches `text-neutral-*` on a bone page, but for text inside an inverted
 *  (ink) section — see the identical constant in page.tsx for why this
 *  can't just be the shared `.kpi`/`.kpil` classes, which are tuned for
 *  bone sections and read the wrong direction here. */
const onDark = {
  muted: "text-[color:color-mix(in_srgb,var(--color-bg)_58%,transparent)]",
  divider: "border-[color:color-mix(in_srgb,var(--color-bg)_16%,transparent)]",
};

/** Matches HomeStats's real layout closely enough that nothing jumps when it swaps in. */
export const HomeStatsFallback = () => (
  <>
    <div className="bg-text">
      <div className="mx-auto w-full max-w-[1180px] px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
    <div className="bg-bg">
      <div className="mx-auto w-full max-w-[1180px] px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
        <Skeleton className="mb-8 h-8 w-40" />
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  </>
);

/**
 * The only part of the landing page that needs Firestore: the real-numbers
 * band and the "Happening now" cards. Split out so `page.tsx` can render
 * the static hero (the LCP element) without an `await` in its way — see
 * page.tsx for why.
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

  const kpis = [
    { value: formatCount(colleges), label: "Colleges hosting" },
    { value: totalEvents ? `${formatCount(totalEvents)}${totalEvents >= 100 ? "+" : ""}` : "0", label: "Events run" },
    { value: formatCount(totalRegistrations), label: "Registrations" },
    { value: "0", label: "Spreadsheets required" },
  ] as const;

  return (
    <>
      {/* ───────────────────── Real numbers (ink) ───────────────────── */}
      <section className="bg-text text-bg">
        <div className="mx-auto w-full max-w-[1180px] px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
          <span className={`mb-6 block text-[10px] font-semibold uppercase tracking-[0.16em] ${onDark.muted}`}>
            [ live on Plansphere ]
          </span>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className={`border p-5 ${onDark.divider}`}>
                <div className="font-display text-[27px] tracking-[-0.02em] text-bg sm:text-[32px]">{k.value}</div>
                <div className={`mt-1.5 text-[10px] uppercase tracking-[0.1em] ${onDark.muted}`}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────── Happening now (bone) ───────────────────── */}
      <section className="bg-bg">
        <div className="mx-auto w-full max-w-[1180px] px-[18px] py-[var(--section-marketing-mobile)] sm:px-6 lg:px-10 lg:py-[var(--section-marketing-desktop)]">
          <div className="mb-8 flex items-end justify-between gap-4 lg:mb-11">
            <div>
              <span className="mb-3 block text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-600">
                [ happening now ]
              </span>
              <h2 className="text-[28px] leading-[0.96] tracking-[-0.025em] sm:text-[38px] sm:leading-[0.92]">
                Live on Plansphere<em className="text-accent not-italic sm:text-emphasis">.</em>
              </h2>
            </div>
            <Link
              href="/explore"
              className="hidden shrink-0 sm:grid sm:h-[46px] sm:w-[46px] sm:place-items-center sm:rounded-full sm:border sm:border-divider sm:text-text sm:transition-colors sm:duration-200 sm:hover:border-accent sm:hover:text-accent"
              aria-label={`See all ${fests.length} fests`}
            >
              <ArrowUpRight size={19} />
            </Link>
          </div>

          {happening.length ? (
            <>
              <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
                {happening.map((fest) => (
                  <div key={fest.id} className="transition-transform duration-200 hover:-translate-y-1">
                    <FestCard fest={fest} />
                  </div>
                ))}
              </div>
              <Link href="/explore" className="btn btn-secondary mt-8 gap-2 sm:hidden">
                See all {fests.length} <ArrowUpRight size={15} />
              </Link>
            </>
          ) : (
            <EmptyState
              title="No fests published yet"
              body="When an Event Head registers the first one it appears here, with live registration and check-in counts."
              action={
                <Link href="/register-event" className="btn btn-fill">
                  Register the first one
                </Link>
              }
            />
          )}
        </div>
      </section>
    </>
  );
}
