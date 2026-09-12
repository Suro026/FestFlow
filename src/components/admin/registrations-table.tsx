"use client";

import * as React from "react";
import { toast } from "sonner";
import { DownloadSimple } from "@phosphor-icons/react";
import type { Registration } from "@/core/models/registration";
import type { Attendance } from "@/core/models/attendance";
import type { Event } from "@/core/models/event";
import type { ScanOutcome } from "@/core/models/attendance";
import { RepositoryError } from "@/core/models/common";
import { hasAtLeast } from "@/core/models/user";
import { useAuth, useRepositories } from "@/components/providers";
import { useFest } from "@/components/shell/admin-shell";
import { useFestAudit } from "./hooks";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, Avatar, Dialog, DialogActions, DialogContent } from "@/components/ui/overlays";
import { EmptyState, Kick, MetaList, MetaRow, Skeleton, Tag } from "@/components/ui/primitives";
import { formatCalendarDate, formatClock, formatRelative } from "@/lib/utils";

/**
 * 3b — the spreadsheet replacement.
 *
 * One table for both the fest-wide view and a single event's view. Rows are
 * live; the entry column resolves from the event's attendance feed; every
 * staff action here is a server route with an audit entry.
 */

export interface RegistrationsTableProps {
  registrations: Registration[] | null;
  attendance: Map<string, Attendance>;
  events: Event[];
  /** When set, the table is for one event and hides the event column. */
  event?: Event;
  loading: boolean;
}

const statusTag = (r: Registration, att?: Attendance) => {
  if (att) return <Tag tone="accent" check>Checked in</Tag>;
  if (r.status === "waitlisted") return <Tag tone="neutral">Waitlisted</Tag>;
  if (r.status === "cancelled") return <Tag tone="neutral">Cancelled</Tag>;
  return <Tag tone="neutral">Confirmed</Tag>;
};

const toCsv = (rows: Registration[], attendance: Map<string, Attendance>, eventTitle?: (id: string) => string) => {
  const head = ["Event", "Team", "Leader", "Email", "Members", "Member emails", "Ticket", "Status", "Registered", "Entry", "Entry method", "Gate"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) => {
    const a = attendance.get(r.id);
    return [
      eventTitle ? eventTitle(r.eventId) : r.eventTitle,
      r.teamName ?? "",
      r.userName,
      r.userEmail,
      r.members.length,
      r.members.map((m) => m.email).join("; "),
      r.ticketCode,
      a ? "checked_in" : r.status,
      r.createdAt.toISOString(),
      a ? a.scannedAt.toISOString() : "",
      a ? a.method : "",
      a?.gate ?? "",
    ]
      .map(esc)
      .join(",");
  });
  return [head.map(esc).join(","), ...lines].join("\r\n");
};

export const RegistrationsTable = ({ registrations, attendance, events, event, loading }: RegistrationsTableProps) => {
  const { session } = useAuth();
  const repos = useRepositories();
  const { fest } = useFest();
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<"all" | "confirmed" | "checked" | "waitlisted" | "cancelled">("all");
  const [open, setOpen] = React.useState<Registration | null>(null);
  const [override, setOverride] = React.useState("");
  const [overrideEvent, setOverrideEvent] = React.useState(event?.id ?? "");
  const [overriding, setOverriding] = React.useState(false);
  const audit = useFestAudit(fest.id, 8);

  const isAdmin = session ? hasAtLeast(session.role, "admin") : false;
  const eventTitle = React.useCallback((id: string) => events.find((e) => e.id === id)?.title ?? "—", [events]);

  const rows = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (registrations ?? []).filter((r) => {
      const att = attendance.get(r.id);
      const state = att ? "checked" : r.status;
      if (filter !== "all" && !(filter === "confirmed" ? r.status === "confirmed" && !att : state === filter)) return false;
      if (!term) return true;
      return [r.userName, r.userEmail, r.ticketCode, r.teamName, ...r.members.flatMap((m) => [m.name, m.email])]
        .some((v) => v?.toLowerCase().includes(term));
    });
  }, [registrations, attendance, filter, search]);

  const counts = React.useMemo(() => {
    const all = registrations ?? [];
    return {
      confirmed: all.filter((r) => r.status === "confirmed").length,
      checked: all.filter((r) => attendance.has(r.id)).length,
      waitlisted: all.filter((r) => r.status === "waitlisted").length,
      cancelled: all.filter((r) => r.status === "cancelled").length,
      seats: all.filter((r) => r.status === "confirmed").reduce((s, r) => s + r.seats, 0),
    };
  }, [registrations, attendance]);

  const exportCsv = () => {
    const csv = toCsv(rows, attendance, event ? undefined : eventTitle);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fest.slug}${event ? `-${event.slug}` : ""}-registrations.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markEntry = async () => {
    if (!override.trim() || !overrideEvent) return;
    setOverriding(true);
    try {
      const outcome: ScanOutcome = await repos.attendance.recordScan({
        ticketCode: override.trim(),
        eventId: overrideEvent,
        scannedBy: session!.uid,
        method: "manual",
      });
      switch (outcome.result) {
        case "ok":
          toast.success(`Entry marked · ${outcome.registration.userName}`);
          setOverride("");
          break;
        case "already-recorded":
          toast(`Already checked in at ${formatClock(outcome.at)}${outcome.by ? ` by ${outcome.by}` : ""}`);
          break;
        case "not-found":
          toast.error("No registration matches that code or email");
          break;
        case "wrong-event":
          toast.error(`That ticket is for ${outcome.expectedEventTitle}`);
          break;
        case "cancelled":
          toast.error("That registration was cancelled");
          break;
      }
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't mark entry");
    } finally {
      setOverriding(false);
    }
  };

  const chip = (key: typeof filter, label: string, n: number, tone: "accent" | "neutral") => (
    <button type="button" onClick={() => setFilter(filter === key ? "all" : key)} className={`tag ${filter === key ? "tag-outline" : `tag-${tone}`} cursor-pointer`} aria-pressed={filter === key}>
      {label} {n}
    </button>
  );

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {chip("confirmed", "Confirmed", counts.confirmed, "accent")}
          {chip("checked", "Checked in", counts.checked, "neutral")}
          {chip("waitlisted", "Waitlisted", counts.waitlisted, "neutral")}
          {chip("cancelled", "Cancelled", counts.cancelled, "neutral")}
          <span className="ml-1.5 text-[12px] text-neutral-500">One active registration per participant per event</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="search" placeholder="Search name, email or ticket" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-[250px]" aria-label="Search registrations" />
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <DownloadSimple size={15} /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <EmptyState title={registrations?.length ? "Nothing matches" : "No registrations yet"} body={registrations?.length ? "Try another filter." : "Entries appear here the moment a student registers."} />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {event ? null : <th>Event</th>}
                <th>Team</th>
                <th>Leader</th>
                <th>Members</th>
                <th>Ticket</th>
                <th>Registered</th>
                <th>Entry</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const att = attendance.get(r.id);
                return (
                  <tr key={r.id}>
                    {event ? null : <td className="max-w-[180px] truncate">{eventTitle(r.eventId)}</td>}
                    <td>{r.teamName ?? <span className="text-neutral-500">Solo</span>}</td>
                    <td>{r.userName}</td>
                    <td>{r.members.length}</td>
                    <td className="code text-[12.5px]">{r.ticketCode}</td>
                    <td className="whitespace-nowrap">{formatCalendarDate(r.createdAt.toISOString().slice(0, 10))}</td>
                    <td className="whitespace-nowrap">{att ? `${formatClock(att.scannedAt)}${att.gate ? ` · ${att.gate}` : ""}${att.method === "manual" ? " · manual" : ""}` : "—"}</td>
                    <td>{statusTag(r, att)}</td>
                    <td className="whitespace-nowrap text-right">
                      <button type="button" className="btn btn-ghost text-[12px]" onClick={() => setOpen(r)}>
                        {r.status === "waitlisted" && isAdmin ? "Promote" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-2" id="audit">
          <div className="rounded-md p-[17px] shadow-[var(--shadow-sm)]">
            <Kick className="mb-2.5">Manual override</Kick>
            <div className="mb-3 text-[13.5px] text-neutral-300">
              Mark entry for a participant whose phone died. The override is written to the audit log against your account and shows as{" "}
              <span className="text-text">manual</span> in every report.
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {event ? null : (
                <select className="input sm:w-[200px]" value={overrideEvent} onChange={(e) => setOverrideEvent(e.target.value)} aria-label="Event">
                  <option value="">Event…</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              )}
              <Input placeholder="Ticket code or email" value={override} onChange={(e) => setOverride(e.target.value)} className="flex-1" aria-label="Ticket code or email" />
              <Button variant="primary" onClick={markEntry} loading={overriding} disabled={!override.trim() || !overrideEvent}>
                Mark entry
              </Button>
            </div>
          </div>
          <div className="rounded-md p-[17px] shadow-[var(--shadow-sm)]">
            <Kick className="mb-2.5">Recent audit entries</Kick>
            {audit.loading ? (
              <Skeleton className="h-20" />
            ) : audit.data && audit.data.length ? (
              <MetaList>
                {audit.data.map((a) => (
                  <MetaRow key={a.id} label={`${formatClock(a.createdAt)} · ${a.actorName.split(/\s+/)[0]} (${a.actorRole.replace("_", " ")})`}>
                    {a.summary}
                  </MetaRow>
                ))}
              </MetaList>
            ) : (
              <div className="text-[12.5px] text-neutral-500">No privileged actions yet.</div>
            )}
          </div>
        </div>
      ) : null}

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        {open ? (
          <DialogContent title={open.teamName ?? open.userName} description={`${eventTitle(open.eventId)} · ${open.ticketCode}`} size="md">
            <RegistrationDetail registration={open} attendance={attendance.get(open.id)} isAdmin={isAdmin} onDone={() => setOpen(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
};

const RegistrationDetail = ({ registration: r, attendance: att, isAdmin, onDone }: { registration: Registration; attendance?: Attendance; isAdmin: boolean; onDone: () => void }) => {
  const repos = useRepositories();
  const [busy, setBusy] = React.useState<"promote" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const act = async (action: "promote" | "cancel") => {
    setBusy(action);
    try {
      const result = await repos.registrations.staffAction(r.id, action);
      toast.success(result === "promoted" ? "Promoted — the seat is theirs" : result === "cancelled" ? "Registration cancelled" : "No change");
      onDone();
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't do that");
    } finally {
      setBusy(null);
      setConfirmCancel(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <MetaList>
        <MetaRow label="Status">{statusTag(r, att)}</MetaRow>
        <MetaRow label="Registered">{formatRelative(r.createdAt)} · {formatCalendarDate(r.createdAt.toISOString().slice(0, 10))}</MetaRow>
        <MetaRow label="Seats">{r.seats}</MetaRow>
        {att ? <MetaRow label="Entry">{formatClock(att.scannedAt)}{att.gate ? ` · ${att.gate}` : ""} · {att.method}{att.scannedByName ? ` · by ${att.scannedByName}` : ""}</MetaRow> : null}
        {r.cancelledAt ? <MetaRow label="Cancelled">{formatRelative(r.cancelledAt)}</MetaRow> : null}
      </MetaList>
      <div>
        <Kick className="mb-2">{r.members.length > 1 ? "Members" : "Participant"}</Kick>
        <div className="flex flex-col gap-2">
          {r.members.map((m) => (
            <div key={m.email} className="flex items-center gap-2.5">
              <Avatar name={m.name} size={26} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px]">{m.name}{m.college ? <span className="text-neutral-500"> · {m.college}</span> : null}</div>
                <div className="truncate text-[11px] text-neutral-500">{m.email}{m.phone ? ` · ${m.phone}` : ""}</div>
              </div>
              {m.isLeader ? <Tag tone="outline">Leader</Tag> : m.userId ? null : <Tag tone="neutral" className="opacity-70">No account</Tag>}
            </div>
          ))}
        </div>
      </div>
      {isAdmin && r.status !== "cancelled" ? (
        <DialogActions>
          {r.status === "waitlisted" ? (
            <Button variant="primary" onClick={() => act("promote")} loading={busy === "promote"}>
              Promote to confirmed
            </Button>
          ) : null}
          <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
            <Button variant="danger" onClick={() => setConfirmCancel(true)}>
              Cancel registration
            </Button>
            <AlertDialogContent
              title="Cancel this registration?"
              description="The holder is notified, their seats return to the pool, and the next waitlisted entry that fits is promoted. Logged under your name."
              confirmLabel="Cancel registration"
              destructive
              loading={busy === "cancel"}
              onConfirm={() => act("cancel")}
            />
          </AlertDialog>
        </DialogActions>
      ) : null}
    </div>
  );
};
