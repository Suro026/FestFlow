import { cache } from "react";
import { repositories } from "@/data/repositories";
import type { Fest } from "@/core/models/fest";
import { DashboardSection, EventsSection } from "./sections";

export interface HomeData {
  /** Every published fest, soonest first. */
  fests: Fest[];
  /** Up to three: live now, then upcoming; if neither exists, the most recent. */
  featured: Fest[];
  liveCount: number;
  registrations: number;
  checkIns: number;
  /** Check-ins over registrations, only across fests that have started. Null until a fest has recorded check-ins. */
  attendancePct: number | null;
  /** Registrations per fest in date order, for the graph. Empty when there is nothing real to draw. */
  series: number[];
  liveFest: Fest | null;
  nextFest: Fest | null;
  /** "Saturday, March 14" in India time. */
  dateLabel: string;
}

const IST = "Asia/Kolkata";

/** One read per render, shared by the dashboard and the events grid. */
export const getHomeData = cache(async (): Promise<HomeData> => {
  const published = await repositories().fests.listPublished().catch(() => [] as Fest[]);
  const fests = [...published].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: IST });

  const live = fests.filter((f) => f.startDate <= today && f.endDate >= today);
  const upcoming = fests.filter((f) => f.startDate > today);
  const featured = [...live, ...upcoming].slice(0, 3);
  if (!featured.length) featured.push(...[...fests].reverse().slice(0, 3));

  const registrations = fests.reduce((n, f) => n + f.stats.registrations, 0);
  const checkIns = fests.reduce((n, f) => n + f.stats.checkIns, 0);
  const started = fests.filter((f) => f.startDate <= today);
  const startedRegistrations = started.reduce((n, f) => n + f.stats.registrations, 0);
  const startedCheckIns = started.reduce((n, f) => n + f.stats.checkIns, 0);
  const attendancePct =
    startedRegistrations > 0 && startedCheckIns > 0
      ? Math.min(100, Math.round((startedCheckIns / startedRegistrations) * 100))
      : null;

  return {
    fests,
    featured,
    liveCount: live.length,
    registrations,
    checkIns,
    attendancePct,
    series: fests.slice(-12).map((f) => f.stats.registrations),
    liveFest: live[0] ?? null,
    nextFest: upcoming[0] ?? null,
    dateLabel: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: IST }).format(new Date()),
  };
});

export async function HomeDashboard() {
  return <DashboardSection data={await getHomeData()} />;
}

export async function HomeEvents() {
  const { featured } = await getHomeData();
  return <EventsSection fests={featured} />;
}
