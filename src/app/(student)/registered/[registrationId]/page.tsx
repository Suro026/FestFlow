"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { Page } from "@/components/shell/student-shell";
import { DigitalTicket } from "@/components/student/digital-ticket";
import { useMyEntries } from "@/components/student/use-my-entries";
import { EmptyState, MetaList, MetaRow, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/utils";

/** 4b — "You're in". The confirmation, with the ticket already on screen. */
export default function RegisteredPage() {
  const { registrationId } = useParams<{ registrationId: string }>();
  const { entries, isPending } = useMyEntries();
  const entry = entries.find((e) => e.registration.id === registrationId);

  if (isPending && !entry) {
    return (
      <Page className="max-w-[560px] pt-7">
        <Skeleton className="mb-4 h-14 w-14 rounded-full" />
        <Skeleton className="mb-3 h-9 w-40" />
        <Skeleton className="mb-6 h-4 w-72" />
        <Skeleton className="h-[420px]" />
      </Page>
    );
  }

  if (!entry) {
    return (
      <Page className="max-w-[560px] pt-7">
        <EmptyState
          title="We couldn't find that registration"
          body="It may belong to a different account. Your entries are listed under My events."
          action={
            <Button asChild variant="primary">
              <Link href="/my-events">Go to My events</Link>
            </Button>
          }
        />
      </Page>
    );
  }

  const { registration, event, fest } = entry;
  const teammates = registration.members.filter((m) => !m.isLeader).map((m) => m.name.split(/\s+/)[0]);
  const waitlisted = registration.status === "waitlisted";

  return (
    <Page className="max-w-[560px] pb-10 pt-[26px]">
      <div className="mb-[18px] grid h-[58px] w-[58px] place-items-center rounded-full text-accent shadow-[inset_0_0_0_2px_var(--color-accent)]">
        <Check size={28} weight="bold" />
      </div>
      <h1 className="text-[31px] leading-[1.06] tracking-[-0.025em]">{waitlisted ? "You're on the list" : "You're in"}</h1>
      <p className="mt-2.5 text-[14px] text-neutral-300">
        {registration.teamName ? `Team ${registration.teamName} is` : "You're"} {waitlisted ? "waitlisted for" : "registered for"}{" "}
        {registration.eventTitle}.
      </p>

      <div className="mt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="kick">Your ticket</span>
          {event ? (
            <span className="text-[13px]">
              {formatCalendarDate(event.date)} · {event.startTime} · {event.venue}
            </span>
          ) : null}
        </div>
        <DigitalTicket registration={registration} festName={fest?.name ?? ""} organizationName={fest?.organizationName} compact />
        <div className="mt-2 text-[12px] text-neutral-500">Saved to your device. Works with no signal.</div>
      </div>

      <MetaList className="mt-4">
        <MetaRow label="Confirmation email">Sent to {registration.userEmail}</MetaRow>
        {teammates.length ? <MetaRow label="Teammates notified">{teammates.join(", ")}</MetaRow> : null}
        <MetaRow label="Certificate">After attendance is confirmed</MetaRow>
      </MetaList>

      <div className="mt-4 flex flex-col gap-[9px]">
        <Button asChild variant="primary" size="lg" block>
          <Link href={`/my-pass?r=${registration.id}`}>View my pass</Link>
        </Button>
        <Button asChild variant="ghost" block>
          <Link href={fest ? `/f/${fest.slug}` : "/explore"}>Back to the fest</Link>
        </Button>
      </div>
    </Page>
  );
}
