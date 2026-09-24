"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPage, useFest } from "@/components/shell/admin-shell";
import { useAuth, useRepositories } from "@/components/providers";
import { useFestEvents } from "@/components/admin/hooks";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/overlays";
import { Artwork, EmptyState, Kick, MetaList, MetaRow, Note, PageHeading, Skeleton, Tag } from "@/components/ui/primitives";
import type { Event } from "@/core/models/event";
import { CERTIFICATE_LABELS, type Certificate } from "@/core/models/certificate";
import type { GenerateSummary } from "@/core/repositories/certificate-repository";
import { RepositoryError } from "@/core/models/common";
import { hasAtLeast } from "@/core/models/user";
import { formatCalendarDate, formatCount, formatRelative } from "@/lib/utils";

interface EventRow {
  event: Event;
  eligible: number | null;
  issued: number;
  resultsPublished: boolean;
  lastIssued: Date | null;
  delivered: number;
  pending: number;
}

/**
 * 4d — Certificate center. One row per event with what it is waiting on,
 * a generate flow that always previews (dry run) before it writes, the
 * delivery log, and revocation. Everything here is a server route; a client
 * cannot mint a certificate.
 */
export default function CertificateCenterPage() {
  const { fest, basePath } = useFest();
  const { session } = useAuth();
  const repos = useRepositories();
  const client = useQueryClient();
  const events = useFestEvents(fest.id);
  const [preview, setPreview] = React.useState<{ event: Event; summary: GenerateSummary } | null>(null);
  const [log, setLog] = React.useState<Event | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const isAdmin = session ? hasAtLeast(session.role, "admin") : false;

  const certs = useQuery({
    queryKey: ["fest-certificates", fest.id],
    queryFn: async () => {
      const page = await repos.certificates.list({ festId: fest.id, includeRevoked: true, limit: 1000 });
      return page.items;
    },
    staleTime: 15_000,
  });

  const rows = React.useMemo<EventRow[]>(() => {
    const all = certs.data ?? [];
    return (events.data ?? [])
      .filter((e) => e.status !== "draft" && e.status !== "cancelled")
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((event) => {
        const mine = all.filter((c) => c.eventId === event.id && !c.revoked);
        return {
          event,
          eligible: null,
          issued: mine.length,
          resultsPublished: Boolean(event.resultsPublishedAt),
          lastIssued: mine.reduce<Date | null>((m, c) => (!m || c.issuedAt > m ? c.issuedAt : m), null),
          delivered: mine.filter((c) => c.delivery.status === "sent").length,
          pending: mine.filter((c) => c.delivery.status !== "sent").length,
        };
      });
  }, [events.data, certs.data]);

  const total = (certs.data ?? []).filter((c) => !c.revoked).length;
  const awaitingEmail = (certs.data ?? []).filter((c) => !c.revoked && c.delivery.status !== "sent").length;

  const dryRun = async (event: Event) => {
    setBusy(event.id);
    try {
      const summary = await repos.certificates.generateForEvent(event.id, { dryRun: true });
      setPreview({ event, summary });
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't compute eligibility");
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (!preview) return;
    setBusy("generate");
    try {
      const summary = await repos.certificates.generateForEvent(preview.event.id, { dryRun: false });
      toast.success(`${summary.created} issued · ${summary.emailed} emailed${summary.skipped ? ` · ${summary.skipped} awaiting an email provider` : ""}`);
      setPreview(null);
      client.invalidateQueries({ queryKey: ["fest-certificates", fest.id] });
      client.invalidateQueries({ queryKey: ["fest-certificates-count", fest.id] });
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Generation failed");
    } finally {
      setBusy(null);
    }
  };

  const deliver = async () => {
    setBusy("deliver");
    try {
      const r = await repos.certificates.deliverPending(fest.id);
      if (r.reason) toast(r.reason);
      else toast.success(`${r.sent} sent · ${r.failed} failed`);
      client.invalidateQueries({ queryKey: ["fest-certificates", fest.id] });
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't send");
    } finally {
      setBusy(null);
    }
  };

  const statusFor = (r: EventRow) => {
    if (r.event.status !== "completed") return <Tag tone="neutral">Event not ended</Tag>;
    if (r.issued > 0 && r.pending === 0) return <Tag tone="neutral">Emailed {r.lastIssued ? formatCalendarDate(r.lastIssued.toISOString().slice(0, 10)) : ""}</Tag>;
    if (r.issued > 0) return <Tag tone="neutral">Issued · {r.pending} awaiting email</Tag>;
    if (r.event.eventType === "team" || r.event.category === "hackathon") {
      return r.resultsPublished ? <Tag tone="accent">Ready</Tag> : <Tag tone="neutral">Awaiting results</Tag>;
    }
    return <Tag tone="accent">Ready</Tag>;
  };

  return (
    <AdminPage className="pb-8 pt-[26px]">
      <PageHeading
        title="Certificate center"
        sub={`Generated server-side from confirmed attendance · ${formatCount(total)} issued so far${awaitingEmail ? ` · ${awaitingEmail} awaiting email` : ""}`}
        actions={
          isAdmin && awaitingEmail > 0 ? (
            <Button variant="primary" onClick={deliver} loading={busy === "deliver"}>
              Send {awaitingEmail} pending
            </Button>
          ) : null
        }
        className="mb-5"
      />

      <div className="grid gap-[26px] lg:grid-cols-[1fr_240px]">
        <div>
          {events.loading || certs.isPending ? (
            <Skeleton className="h-56" />
          ) : rows.length === 0 ? (
            <EmptyState title="No events to certify yet" body="Events appear here once they are published. Certificates unlock when an event is marked completed." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Checked in</th>
                    <th>Issued</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.event.id}>
                      <td>
                        <Link href={`${basePath}/events/${r.event.slug}/settings`} className="text-inherit no-underline hover:text-accent">
                          {r.event.title}
                        </Link>
                        <div className="text-[11.5px] text-neutral-500">{formatCalendarDate(r.event.date)}</div>
                      </td>
                      <td>
                        <CheckedInCount eventId={r.event.id} />
                      </td>
                      <td>{r.issued}</td>
                      <td>{statusFor(r)}</td>
                      <td className="whitespace-nowrap text-right">
                        {isAdmin && r.event.status === "completed" ? (
                          <button type="button" className="btn btn-ghost text-[12px]" onClick={() => dryRun(r.event)} disabled={busy === r.event.id}>
                            {busy === r.event.id ? "Checking…" : r.issued ? "Re-run" : "Generate"}
                          </button>
                        ) : null}
                        {r.issued ? (
                          <button type="button" className="btn btn-ghost text-[12px]" onClick={() => setLog(r.event)}>
                            Delivery log
                          </button>
                        ) : null}
                        {!r.resultsPublished && r.event.status === "completed" ? (
                          <Link href={`${basePath}/events/${r.event.slug}/results`} className="btn btn-ghost text-[12px]">
                            Results
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <MetaList className="mt-5">
            <MetaRow label="Template">{fest.name} · issued in {fest.organizationName}’s name</MetaRow>
            <MetaRow label="ID format" mono>PS-YYYY-XXXXXXXX</MetaRow>
            <MetaRow label="Delivery">Emailed to the registered address · retried on failure</MetaRow>
            <MetaRow label="Verification">Public page per certificate at /verify/[number]</MetaRow>
            <MetaRow label="Revocation">Available per certificate from the delivery log, logged</MetaRow>
          </MetaList>
        </div>

        <div>
          <Kick className="mb-2.5">Template</Kick>
          <Artwork label="A4 landscape · college seal & signature come with template editing" className="aspect-[1.414] items-center justify-center rounded-md" />
          <Button variant="secondary" block className="mt-2.5" disabled>
            Edit template
          </Button>
          <div className="mt-3 text-[12px] text-neutral-500">
            Winner certificates carry the rank from published results. Participation certificates need only a verified gate scan.
          </div>
        </div>
      </div>

      <Dialog open={preview !== null} onOpenChange={(o) => !o && setPreview(null)}>
        {preview ? (
          <DialogContent title={`Generate for ${preview.event.title}`} description="Nothing has been written yet. This is what the run will do." size="md">
            <MetaList>
              <MetaRow label="Eligible">{preview.summary.eligible} people</MetaRow>
              {Object.entries(preview.summary.byType)
                .filter(([, n]) => n > 0)
                .map(([type, n]) => (
                  <MetaRow key={type} label={CERTIFICATE_LABELS[type as keyof typeof CERTIFICATE_LABELS] ?? type}>
                    {n}
                  </MetaRow>
                ))}
              <MetaRow label="Delivery">Email with PDF attached · also appears in each student’s account instantly</MetaRow>
            </MetaList>
            {preview.summary.unmatched.length ? (
              <Note title={`${preview.summary.unmatched.length} attendee${preview.summary.unmatched.length === 1 ? "" : "s"} without a Plansphere account`}>
                Their certificate can’t be filed under an account yet. When they sign up with the same email, re-run this and it is issued to them.
                <div className="mt-2 flex flex-col gap-0.5 text-[12px]">
                  {preview.summary.unmatched.slice(0, 6).map((u) => (
                    <div key={u.email}>
                      {u.name} · {u.email}
                    </div>
                  ))}
                  {preview.summary.unmatched.length > 6 ? <div>+{preview.summary.unmatched.length - 6} more</div> : null}
                </div>
              </Note>
            ) : null}
            {preview.summary.eligible === 0 ? (
              <Note title="Nobody is eligible yet">Certificates go only to entries that were scanned at the gate. No check-ins, no certificates.</Note>
            ) : null}
            <DialogActions>
              <Button variant="secondary" onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={generate} loading={busy === "generate"} disabled={preview.summary.eligible === 0}>
                Generate &amp; email {preview.summary.eligible}
              </Button>
            </DialogActions>
          </DialogContent>
        ) : null}
      </Dialog>

      <Dialog open={log !== null} onOpenChange={(o) => !o && setLog(null)}>
        {log ? (
          <DialogContent title="Delivery log" description={log.title} size="lg">
            <DeliveryLog event={log} certificates={(certs.data ?? []).filter((c) => c.eventId === log.id)} isAdmin={isAdmin} onChanged={() => client.invalidateQueries({ queryKey: ["fest-certificates", fest.id] })} />
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

const CheckedInCount = ({ eventId }: { eventId: string }) => {
  const repos = useRepositories();
  const q = useQuery({ queryKey: ["event-checkins", eventId], queryFn: () => repos.attendance.countByEvent(eventId), staleTime: 30_000 });
  return <>{q.data ?? "…"}</>;
};

const DeliveryLog = ({ event, certificates, isAdmin, onChanged }: { event: Event; certificates: Certificate[]; isAdmin: boolean; onChanged: () => void }) => {
  const repos = useRepositories();
  const [search, setSearch] = React.useState("");
  const [revoking, setRevoking] = React.useState<Certificate | null>(null);
  const [reason, setReason] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const term = search.trim().toLowerCase();
  const rows = certificates
    .filter((c) => !term || c.recipientName.toLowerCase().includes(term) || c.recipientEmail.toLowerCase().includes(term) || c.certificateNumber.toLowerCase().includes(term))
    .sort((a, b) => a.recipientName.localeCompare(b.recipientName));

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await repos.certificates.revoke(revoking.id, reason);
      toast.success(`Revoked ${revoking.certificateNumber}`);
      setRevoking(null);
      setReason("");
      onChanged();
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't revoke");
    } finally {
      setBusy(false);
    }
  };

  const tone = (c: Certificate): "danger" | "accent" | "neutral" => (c.revoked ? "danger" : c.delivery.status === "sent" ? "accent" : "neutral");
  const label = (c: Certificate) => (c.revoked ? "Revoked" : c.delivery.status === "sent" ? `Sent${c.delivery.sentAt ? ` · ${formatRelative(c.delivery.sentAt)}` : ""}` : c.delivery.status === "failed" ? "Failed" : c.delivery.status === "skipped" ? "Awaiting email provider" : "Pending");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[12.5px] text-neutral-500">
          {certificates.filter((c) => !c.revoked).length} issued · {certificates.filter((c) => c.delivery.status === "sent").length} sent · {formatCalendarDate(event.date)}
        </div>
        <Input type="search" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-[200px]" aria-label="Search certificates" />
      </div>
      <div className="table-wrap max-h-[50dvh] overflow-y-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Type</th>
              <th>Number</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={c.revoked ? "opacity-60" : ""}>
                <td>
                  {c.recipientName}
                  <div className="text-[11.5px] text-neutral-500">{c.recipientEmail}</div>
                </td>
                <td className="whitespace-nowrap">{CERTIFICATE_LABELS[c.type].replace("Certificate of ", "").replace("Excellence — ", "")}</td>
                <td className="code text-[12px]">{c.certificateNumber}</td>
                <td>
                  <Tag tone={tone(c)}>{label(c)}</Tag>
                  {c.delivery.lastError ? <div className="mt-0.5 max-w-[220px] truncate text-[11px] text-neutral-500" title={c.delivery.lastError}>{c.delivery.lastError}</div> : null}
                </td>
                <td className="whitespace-nowrap text-right">
                  <a href={`/verify/${c.certificateNumber}`} target="_blank" rel="noreferrer" className="btn btn-ghost text-[12px]">
                    Verify
                  </a>
                  {c.fileUrl ? (
                    <a href={c.fileUrl} target="_blank" rel="noreferrer" className="btn btn-ghost text-[12px]">
                      PDF
                    </a>
                  ) : null}
                  {isAdmin && !c.revoked ? (
                    <button type="button" className="btn btn-ghost text-[12px] text-danger" onClick={() => setRevoking(c)}>
                      Revoke
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {revoking ? (
        <div className="rounded-md p-3.5 shadow-[inset_0_0_0_1px_var(--color-danger)]">
          <div className="mb-2 text-[13.5px]">
            Revoke {revoking.certificateNumber} for {revoking.recipientName}?
          </div>
          <div className="mb-2.5 text-[12.5px] text-neutral-400">The number stays reserved and the verify page will say “revoked”. The PDF renders with a banner. Logged under your name.</div>
          <Input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} className="mb-2.5" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRevoking(null)}>
              Keep it
            </Button>
            <Button variant="danger" onClick={revoke} loading={busy} disabled={reason.trim().length < 3}>
              Revoke
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
