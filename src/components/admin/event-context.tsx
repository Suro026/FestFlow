"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Event } from "@/core/models/event";
import { useFest } from "@/components/shell/admin-shell";
import { useFestEvents } from "./hooks";
import { EmptyState, Skeleton, Tag } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/utils";

interface EventContextValue {
  event: Event;
  eventPath: string;
}

const EventContext = React.createContext<EventContextValue | null>(null);

export const useAdminEvent = (): EventContextValue => {
  const value = React.useContext(EventContext);
  if (!value) throw new Error("useAdminEvent must be used inside an admin event route");
  return value;
};

/**
 * Resolves `/events/[eventSlug]` from the fest's live event list (so drafts
 * are reachable and edits appear without a refresh) and draws the per-event
 * sub-navigation the canvas shows on 4c/4d/4e.
 */
export const EventProvider = ({ eventSlug, children }: { eventSlug: string; children: React.ReactNode }) => {
  const { fest, basePath } = useFest();
  const events = useFestEvents(fest.id);
  const pathname = usePathname();

  if (events.loading) {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-5 py-7 lg:px-8" aria-busy>
        <Skeleton className="mb-3 h-3 w-40" />
        <Skeleton className="mb-6 h-8 w-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const event = (events.data ?? []).find((e) => e.slug === eventSlug);

  if (!event) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-5 py-16">
        <EmptyState
          title="No such event in this fest"
          body="It may have been deleted, or the address changed."
          action={
            <Button asChild variant="primary">
              <Link href={`${basePath}/events`}>All events</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const eventPath = `${basePath}/events/${event.slug}`;
  const tabs = [
    { seg: "settings", label: "Settings" },
    { seg: "registrations", label: "Registrations" },
    { seg: "analytics", label: "Analytics" },
    { seg: "results", label: "Results" },
    { seg: "live", label: "Live" },
  ];

  return (
    <EventContext.Provider value={{ event, eventPath }}>
      <div className="border-b border-divider">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 text-[13px] lg:px-8">
          <Link href={`${basePath}/events`} className="text-neutral-500 no-underline hover:text-accent">
            Events
          </Link>
          <span className="text-neutral-700">/</span>
          <span className="font-medium">{event.title}</span>
          <span className="text-[12px] text-neutral-500">
            {formatCalendarDate(event.date)} · {event.startTime}
          </span>
          <Tag tone={event.status === "ongoing" ? "accent" : event.status === "draft" ? "outline" : "neutral"}>
            {event.status[0]!.toUpperCase() + event.status.slice(1)}
          </Tag>
          <nav className="ml-auto flex gap-4" aria-label="Event sections">
            {tabs.map((t) => {
              const href = `${eventPath}/${t.seg}`;
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link key={t.seg} href={href} className="nav-link" aria-current={active ? "page" : undefined}>
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      {children}
    </EventContext.Provider>
  );
};
