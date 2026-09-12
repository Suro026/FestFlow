"use client";

import * as React from "react";
import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import type { Fest } from "@/core/models/fest";
import { Field, Input, RadioOption, Seg } from "@/components/ui/field";
import { Artwork, EmptyState, Kick, Tag } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { FestCard, festPhase } from "./fest-card";
import { formatDateRange } from "@/lib/utils";

export interface FestWithStats {
  fest: Fest;
  events: number;
  registered: number;
}

type When = "now" | "month" | "quarter" | "any";
type View = "grid" | "list";

const WHEN_OPTIONS: Array<{ value: When; label: string }> = [
  { value: "now", label: "Happening now" },
  { value: "month", label: "This month" },
  { value: "quarter", label: "Next 3 months" },
  { value: "any", label: "Any time" },
];

const inWindow = (fest: Fest, when: When, today: Date): boolean => {
  const ymd = today.toISOString().slice(0, 10);
  if (when === "any") return true;
  if (when === "now") return fest.startDate <= ymd && fest.endDate >= ymd;
  const horizon = new Date(today);
  horizon.setMonth(horizon.getMonth() + (when === "month" ? 1 : 3));
  const limit = horizon.toISOString().slice(0, 10);
  return fest.endDate >= ymd && fest.startDate <= limit;
};

/**
 * 1b — filter-first discovery. Desktop: a 236px filter rail beside a 3-up
 * grid. Phone: search plus a filter chip rail above a list with 60px thumbs.
 * The same component renders both; only the layout classes change.
 */
export const ExploreBoard = ({ items }: { items: FestWithStats[] }) => {
  const today = React.useMemo(() => new Date(), []);
  const cities = React.useMemo(
    () => [...new Set(items.map((i) => i.fest.city).filter(Boolean))].sort(),
    [items],
  );

  const [search, setSearch] = React.useState("");
  const [city, setCity] = React.useState<string>("");
  const [when, setWhen] = React.useState<When>(() =>
    items.some((i) => inWindow(i.fest, "now", today)) ? "now" : "any",
  );
  const [view, setView] = React.useState<View>("grid");

  const filtered = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter(({ fest }) => (city ? fest.city === city : true))
      .filter(({ fest }) => inWindow(fest, when, today))
      .filter(({ fest }) =>
        term ? [fest.name, fest.organizationName, fest.city, fest.venue].some((v) => v?.toLowerCase().includes(term)) : true,
      )
      .sort((a, b) => a.fest.startDate.localeCompare(b.fest.startDate));
  }, [items, city, when, search, today]);

  const reset = () => {
    setSearch("");
    setCity("");
    setWhen("any");
  };

  const heading = `${filtered.length} ${filtered.length === 1 ? "fest" : "fests"}${city ? ` in ${city}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-[1180px] flex-1">
      {/* Phone header: title, search, chip rail */}
      <div className="px-[18px] pb-3 pt-2.5 md:hidden">
        <h4 className="mb-2.5 text-[22px] tracking-[-0.02em]">Fests</h4>
        <Input
          type="search"
          placeholder="Search fest, college or city"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2.5"
          aria-label="Search fests"
        />
        <div className="flex gap-[11px] overflow-x-auto scrollbar-none">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="tag tag-outline flex-none cursor-pointer appearance-none bg-transparent pr-6"
            aria-label="City"
            style={{ backgroundImage: "none" }}
          >
            <option value="">All cities ▾</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {WHEN_OPTIONS.filter((o) => o.value !== "any").map((o) => (
            <button
              key={o.value}
              type="button"
              className={`tag flex-none cursor-pointer ${when === o.value ? "tag-accent" : "tag-neutral"}`}
              onClick={() => setWhen(when === o.value ? "any" : o.value)}
              aria-pressed={when === o.value}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[236px_1fr] md:min-h-[640px]">
        {/* Desktop filter rail */}
        <aside className="hidden flex-col gap-[22px] border-r border-divider px-[26px] pb-[30px] pt-[26px] md:flex">
          <Field label="Search" htmlFor="explore-search">
            <Input
              id="explore-search"
              type="search"
              placeholder="Fest, college or venue"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Field>
          <Field label="City" htmlFor="explore-city">
            <select id="explore-city" className="input" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">All cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <div>
            <Kick className="mb-[9px]">When</Kick>
            {WHEN_OPTIONS.map((o) => (
              <RadioOption key={o.value} block name="when" label={o.label} checked={when === o.value} onChange={() => setWhen(o.value)} />
            ))}
          </div>
          <Button variant="secondary" block className="mt-auto" onClick={reset}>
            Reset filters
          </Button>
        </aside>

        {/* Results */}
        <section className="px-[18px] pb-[34px] pt-3 md:px-9 md:pt-[26px]">
          <div className="mb-5 hidden items-center justify-between md:flex">
            <div>
              <h4 className="mb-[3px]">{heading}</h4>
              <div className="text-[12px] text-neutral-500">Sorted by start date</div>
            </div>
            <Seg
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: "Grid" },
                { value: "list", label: "List" },
              ]}
              aria-label="Layout"
            />
          </div>

          <Kick className="pb-2.5 pt-3.5 md:hidden">{when === "now" ? "Happening now" : heading}</Kick>

          {filtered.length === 0 ? (
            <EmptyState
              title="Nothing matches those filters"
              body="Try a wider date range or clear the city. New fests appear here as soon as a college publishes them."
              action={
                <Button variant="secondary" onClick={reset}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <>
              {/* Phone + list view: rows */}
              <div className={view === "list" ? "block" : "block md:hidden"}>
                {filtered.map(({ fest, events, registered }) => {
                  const phase = festPhase(fest, today);
                  return (
                    <Link
                      key={fest.id}
                      href={`/f/${fest.slug}`}
                      className="rule-b flex gap-3 py-[13px] text-inherit no-underline"
                    >
                      <Artwork src={fest.logoUrl ?? fest.bannerUrl} className="h-[60px] w-[60px] flex-none rounded-md" alt="" />
                      <div className="min-w-0 flex-1">
                        <div className="mb-[3px] flex items-center gap-2">
                          <span className="truncate text-[15px] font-medium tracking-[-0.01em]">{fest.name}</span>
                          {phase.live ? <Tag tone="accent">Live</Tag> : null}
                        </div>
                        <div className="mb-[5px] text-[12px] text-neutral-300">{fest.organizationName}</div>
                        <div className="flex flex-wrap gap-x-2.5 text-[11px] text-neutral-500">
                          <span>{formatDateRange(fest.startDate, fest.endDate)}</span>
                          <span>·</span>
                          <span>{events} events</span>
                          <span>·</span>
                          <span>{registered.toLocaleString("en-IN")} registered</span>
                        </div>
                      </div>
                      <CaretRight size={16} className="self-center text-neutral-600" />
                    </Link>
                  );
                })}
              </div>

              {/* Desktop grid */}
              {view === "grid" ? (
                <div className="hidden grid-cols-2 gap-[18px] md:grid lg:grid-cols-3">
                  {filtered.map(({ fest, events, registered }) => (
                    <FestCard key={fest.id} fest={fest} variant="full" stats={{ events, registered }} />
                  ))}
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
};
