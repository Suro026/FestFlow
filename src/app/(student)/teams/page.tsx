"use client";

import Link from "next/link";
import { Page } from "@/components/shell/student-shell";
import { useMyEntries } from "@/components/student/use-my-entries";
import { Avatar } from "@/components/ui/overlays";
import { EmptyState, Kick, Skeleton, Tag } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/utils";

/**
 * Teams — in the tap bar of every student screen in the canvas, but never
 * drawn. Designed here to match: a team is a registration with more than one
 * member, so this is the student's team entries grouped by name, each member
 * shown with whether they have an account yet (a teammate without one won't
 * get their certificate until they sign up with that email).
 */
export default function TeamsPage() {
  const { entries, isPending } = useMyEntries();
  const teams = entries.filter((e) => e.registration.type === "team" && e.registration.status !== "cancelled");

  return (
    <Page className="max-w-[720px] pb-8 pt-2">
      <h4 className="mb-1">Teams</h4>
      <div className="mb-4 text-[12.5px] text-neutral-500">Every team entry you’re part of, and who’s on it.</div>

      {isPending && entries.length === 0 ? (
        <>
          <Skeleton className="mb-3 h-32" />
          <Skeleton className="h-32" />
        </>
      ) : teams.length === 0 ? (
        <EmptyState
          title="No teams yet"
          body="Register for a team event and add your teammates by email. They'll appear here, and each gets their own ticket and certificate."
          action={
            <Button asChild variant="primary">
              <Link href="/explore">Find a team event</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {teams.map(({ registration, event, fest, attendance }) => (
            <div key={registration.id} className="panel p-3.5">
              <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-[15px] font-medium">{registration.teamName}</div>
                  <div className="text-[11.5px] text-neutral-500">
                    {registration.eventTitle}
                    {event ? ` · ${formatCalendarDate(event.date)}` : ""}
                    {fest ? ` · ${fest.name}` : ""}
                  </div>
                </div>
                {attendance ? <Tag tone="accent" check>Checked in</Tag> : <Tag tone="outline">{registration.members.length} members</Tag>}
              </div>
              <Kick className="mb-2">Members</Kick>
              <div className="flex flex-col gap-2">
                {registration.members.map((m) => (
                  <div key={m.email} className="flex items-center gap-2.5">
                    <Avatar name={m.name} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px]">{m.name}</div>
                      <div className="truncate text-[11px] text-neutral-500">{m.email}</div>
                    </div>
                    {m.isLeader ? (
                      <Tag tone="outline">Leader</Tag>
                    ) : m.userId ? (
                      <Tag tone="neutral">Has account</Tag>
                    ) : (
                      <Tag tone="neutral" className="opacity-70">No account yet</Tag>
                    )}
                  </div>
                ))}
              </div>
              {registration.members.some((m) => !m.userId) ? (
                <div className="mt-3 text-[12px] text-neutral-500">
                  Teammates without an account can still enter on this ticket, but their certificate is only issued once
                  they sign up with the email above.
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Page>
  );
}
