import type { Metadata } from "next";
import { repositories } from "@/data/repositories";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { ExploreBoard, type FestWithStats } from "@/components/fest/explore-board";

export const metadata: Metadata = {
  title: "Explore fests",
  description: "Every published fest, filterable by city, date and category.",
};

export const revalidate = 60;

/** 1b — the board. Many fests at once, filter-first and date-anchored. */
export default async function ExplorePage() {
  const repos = repositories();
  const fests = await repos.fests.listPublished().catch(() => []);

  const withStats: FestWithStats[] = await Promise.all(
    fests.map(async (fest) => {
      const [events, registered] = await Promise.all([
        repos.events.countByFest(fest.id).catch(() => 0),
        repos.registrations.countByFest(fest.id).catch(() => 0),
      ]);
      return { fest, events, registered };
    }),
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav active="fests" />
      <ExploreBoard items={withStats} />
      <PublicFooter />
    </div>
  );
}
