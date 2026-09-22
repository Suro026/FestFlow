"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Flashlight, WarningCircle } from "@phosphor-icons/react";
import { useAuth, useRepositories } from "@/components/providers";
import { RequireRole } from "@/components/shell/require-role";
import { Camera, type CameraHandle } from "@/components/scanner/camera";
import { decideEntry, decideMeal, parseTicketCode, useScannerSync } from "@/lib/offline/scanner";
import { Seg, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogContent } from "@/components/ui/overlays";
import { EmptyState, MetaList, MetaRow, Skeleton, StatusBanner, Tag } from "@/components/ui/primitives";
import type { MealType, ScanOutcome } from "@/core/models/attendance";
import { formatCalendarDate, formatClock, formatClockSeconds, formatRelative } from "@/lib/utils";

type Mode = "entry" | "meal";

export default function ScanPage() {
  return (
    <RequireRole minimum="volunteer" fallback="/explore">
      <React.Suspense fallback={<div className="min-h-dvh bg-neutral-900" />}>
        <Scanner />
      </React.Suspense>
    </RequireRole>
  );
}

/**
 * 2c / 3e — the gate scanner.
 *
 * Dark chrome (neutral-900) so the camera reads as the page; the accent inset
 * frame for an accepted scan, the neutral one for a duplicate. Every decision
 * is made locally against the cached roster; the sync banner says exactly
 * how many writes are waiting.
 */
const Scanner = () => {
  const { session, profile } = useAuth();
  const repos = useRepositories();
  const router = useRouter();
  const params = useSearchParams();
  const festSlug = params.get("fest") ?? "";
  const eventSlug = params.get("event") ?? "";
  const eventId = params.get("eventId") ?? "";
  const mode = (params.get("mode") === "meal" ? "meal" : "entry") as Mode;
  const gate = params.get("gate") ?? undefined;

  const fest = useQuery({ queryKey: ["fest-slug", festSlug], enabled: Boolean(festSlug), queryFn: () => repos.fests.getBySlug(festSlug) });
  const events = useQuery({
    queryKey: ["fest-events-scan", fest.data?.id],
    enabled: Boolean(fest.data),
    queryFn: () => repos.events.list({ festId: fest.data!.id, status: ["published", "ongoing"], limit: 200 }).then((p) => p.items),
  });
  const event = React.useMemo(
    () => (events.data ?? []).find((e) => (eventSlug ? e.slug === eventSlug : eventId ? e.id === eventId : false)) ?? null,
    [events.data, eventSlug, eventId],
  );

  const sync = useScannerSync(repos, session?.uid, event);
  const camera = React.useRef<CameraHandle>(null);
  const [outcome, setOutcome] = React.useState<ScanOutcome | null>(null);
  const [manual, setManual] = React.useState(false);
  const [manualCode, setManualCode] = React.useState("");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [torch, setTorch] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [mealType, setMealType] = React.useState<MealType>(() => {
    const h = new Date().getHours();
    return h < 11 ? "breakfast" : h < 16 ? "lunch" : h < 21 ? "dinner" : "snack";
  });

  const busy = React.useRef(false);

  const handle = React.useCallback(
    async (raw: string) => {
      if (!event || !session || busy.current) return;
      const code = parseTicketCode(raw);
      if (!code) {
        setOutcome({ result: "not-found" });
        return;
      }
      busy.current = true;
      try {
        const result =
          mode === "meal"
            ? await decideMeal({ event, code, gate, scannedBy: session.uid, online: sync.online, mealType, servedOn: today, post: gate })
            : await decideEntry({ event, code, gate, scannedBy: session.uid, online: sync.online });
        setOutcome(result);
        if (navigator.vibrate) navigator.vibrate(result.result === "ok" ? 40 : [30, 60, 30]);
        if (sync.online) void sync.sync();
        else void sync.refreshState();
      } finally {
        busy.current = false;
      }
    },
    [event, session, mode, gate, mealType, today, sync],
  );

  const scansToday = sync.history.filter((h) => h.outcome === "ok" && new Date(h.at).toISOString().slice(0, 10) === today).length;
  const scannerName = profile?.fullName?.split(/\s+/)[0] ?? "you";

  /* ── choose an event ── */
  if (!festSlug) {
    return (
      <Shell title="Scanner" sub="Pick a fest">
        <div className="p-[18px]">
          <EmptyState title="Which fest?" body="Open the scanner from the Gate page of a fest, or from your volunteer shifts." action={<Button asChild variant="primary"><Link href="/admin">Admin</Link></Button>} />
        </div>
      </Shell>
    );
  }
  if (fest.isPending || events.isPending) {
    return (
      <Shell title="Scanner" sub="Loading…">
        <div className="p-[18px]">
          <Skeleton className="h-64" />
        </div>
      </Shell>
    );
  }
  if (!fest.data) {
    return (
      <Shell title="Scanner" sub="Unknown fest">
        <div className="p-[18px]">
          <EmptyState title="No such fest" body="Check the link you followed." />
        </div>
      </Shell>
    );
  }
  if (!event) {
    const todays = (events.data ?? []).filter((e) => e.date === today);
    const list = todays.length ? todays : (events.data ?? []);
    return (
      <Shell title={fest.data.name} sub="Choose the event you are scanning for">
        <div className="flex flex-col gap-2 p-[18px]">
          {list.length === 0 ? (
            <EmptyState title="No published events" body="Nothing to scan for yet." />
          ) : (
            list.map((e) => (
              <button
                key={e.id}
                type="button"
                className="panel flex items-center justify-between gap-3 px-3.5 py-3 text-left hover:bg-surface"
                onClick={() => router.replace(`/scan?fest=${festSlug}&event=${e.slug}&mode=${mode}${gate ? `&gate=${encodeURIComponent(gate)}` : ""}`)}
              >
                <div>
                  <div className="text-[14px] font-medium">{e.title}</div>
                  <div className="text-[11.5px] text-neutral-500">
                    {formatCalendarDate(e.date)} · {e.startTime} · {e.venue}
                  </div>
                </div>
                <Tag tone={e.status === "ongoing" ? "accent" : "neutral"}>{e.status === "ongoing" ? "Live" : "Published"}</Tag>
              </button>
            ))
          )}
        </div>
      </Shell>
    );
  }

  /* ── result screens ── */
  if (outcome) {
    const next = () => setOutcome(null);
    const mealLabel = mealType[0]!.toUpperCase() + mealType.slice(1);

    if (outcome.result === "ok") {
      return (
        <Shell title={event.title} sub={`${gate ?? (mode === "meal" ? "Food counter" : "Gate")} · ${scannerName}`} mode={mode} bare>
          <div className="flex flex-1 flex-col justify-center px-[22px] shadow-[inset_0_0_0_3px_var(--color-accent)]">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full text-accent shadow-[inset_0_0_0_2px_var(--color-accent)]">
              <Check size={30} weight="bold" />
            </div>
            <div className="text-[34px] font-medium leading-[1.05] tracking-[-0.025em]">{mode === "meal" ? `${mealLabel} served` : "Checked in"}</div>
            <div className="mt-3 text-[15px] text-neutral-300">
              {outcome.registration.userName}
              {outcome.registration.teamName ? ` · Team ${outcome.registration.teamName}` : ""}
            </div>
            <div className="code mt-[5px] text-neutral-500">{outcome.registration.ticketCode}</div>
            <MetaList className="mt-[22px]">
              {mode === "meal" && outcome.serving ? (
                <MetaRow label="Team progress">
                  {outcome.serving.n} of {outcome.serving.of} served
                </MetaRow>
              ) : outcome.registration.memberCount > 1 ? (
                <MetaRow label="Team">
                  {outcome.registration.teamName ?? "Team"} · {outcome.registration.memberCount} members
                </MetaRow>
              ) : null}
              {mode === "meal" ? <MetaRow label="This slot">{`Day · ${formatCalendarDate(today)} ${mealLabel.toLowerCase()} · ${formatClock(new Date())}`}</MetaRow> : null}
              <MetaRow label="Recorded">
                {formatClockSeconds(new Date())}
                {outcome.queued && !sync.online ? " · queued offline" : ""}
              </MetaRow>
              <MetaRow label={mode === "meal" ? "Served by" : "Scanned by"}>
                {scannerName}
                {gate ? ` · ${gate}` : ""}
              </MetaRow>
            </MetaList>
            {mode === "meal" ? <div className="mt-4 text-[12.5px] text-neutral-400">A second scan for the same slot is refused, not double counted.</div> : null}
          </div>
          <div className="px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-3.5">
            <Button variant="primary" size="lg" block onClick={next}>
              Scan next
            </Button>
          </div>
        </Shell>
      );
    }

    if (outcome.result === "already-recorded") {
      return (
        <Shell title={event.title} sub={`${gate ?? "Gate"} · ${scannerName}`} mode={mode} bare>
          <div className="flex flex-1 flex-col justify-center px-[22px] shadow-[inset_0_0_0_3px_var(--color-neutral-700)]">
            <div className="mb-5 grid h-16 w-16 place-items-center rounded-full text-neutral-300 shadow-[inset_0_0_0_2px_var(--color-neutral-500)]">
              <WarningCircle size={30} />
            </div>
            <div className="text-[34px] font-medium leading-[1.05] tracking-[-0.025em]">
              Already
              <br />
              {mode === "meal" ? "served" : "checked in"}
            </div>
            <MetaList className="mt-[22px]">
              <MetaRow label={mode === "meal" ? "Served" : "First scan"}>{formatClockSeconds(outcome.at)}</MetaRow>
              {outcome.by ? <MetaRow label="By">{outcome.by}</MetaRow> : null}
              <MetaRow label="Counted">Once — not double counted</MetaRow>
            </MetaList>
            <div className="mt-[18px] text-[12.5px] text-neutral-400">Send to a coordinator if this person disputes the record.</div>
          </div>
          <div className="flex gap-[9px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-3.5">
            <Button variant="secondary" className="flex-1" onClick={next}>
              Flag for review
            </Button>
            <Button variant="primary" className="flex-1" onClick={next}>
              Scan next
            </Button>
          </div>
        </Shell>
      );
    }

    // not-found / wrong-event / cancelled
    const title = outcome.result === "cancelled" ? "Cancelled" : outcome.result === "wrong-event" ? "Wrong event" : "Not a valid ticket";
    const body =
      outcome.result === "cancelled"
        ? "This registration was cancelled. Send them to the help desk."
        : outcome.result === "wrong-event"
          ? `This ticket is for ${outcome.expectedEventTitle}. Send them to that gate.`
          : "This code doesn’t match any registration for this event. It may be for a different fest, or the QR may have been altered.";
    return (
      <Shell title={event.title} sub={`${gate ?? "Gate"} · ${scannerName}`} mode={mode} bare>
        <div className="flex flex-1 flex-col justify-center px-[22px] shadow-[inset_0_0_0_3px_var(--color-neutral-700)]">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-full text-neutral-300 shadow-[inset_0_0_0_2px_var(--color-neutral-500)]">
            <WarningCircle size={30} />
          </div>
          <div className="text-[34px] font-medium leading-[1.05] tracking-[-0.025em]">{title}</div>
          <div className="mt-3 max-w-[40ch] text-[14px] text-neutral-300">{body}</div>
          <MetaList className="mt-[22px]">
            <MetaRow label="What to do">Ask the participant to open My pass</MetaRow>
            {!sync.online ? <MetaRow label="Note">You’re offline — a registration made in the last few minutes may not be in this device’s roster yet.</MetaRow> : null}
          </MetaList>
        </div>
        <div className="flex gap-[9px] px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-3.5">
          <Button variant="secondary" className="flex-1" onClick={() => { setOutcome(null); setManual(true); }}>
            Enter code
          </Button>
          <Button variant="primary" className="flex-1" onClick={next}>
            Scan next
          </Button>
        </div>
      </Shell>
    );
  }

  /* ── idle: camera ── */
  return (
    <Shell title={event.title} sub={`${gate ?? (mode === "meal" ? "Food counter" : "Gate")} · ${scannerName}`} mode={mode} bare>
      <div className="px-[18px] pb-3 pt-1">
        {mode === "meal" ? (
          <>
            <Seg
              fill
              value={mealType}
              onChange={setMealType}
              options={(["breakfast", "lunch", "dinner", "snack"] as MealType[]).map((m) => ({ value: m, label: m[0]!.toUpperCase() + m.slice(1) }))}
              aria-label="Meal"
            />
            <div className="mt-[9px] text-[11.5px] text-neutral-500">
              {formatCalendarDate(today)} · one serving per person per slot
            </div>
          </>
        ) : null}
        {!sync.online ? (
          <StatusBanner className="mt-2" trailing={sync.pending ? "Retrying when online" : undefined}>
            Offline — {sync.pending} scan{sync.pending === 1 ? "" : "s"} queued
          </StatusBanner>
        ) : sync.pending > 0 ? (
          <StatusBanner className="mt-2" trailing={sync.syncing ? "Syncing…" : "Retrying"}>
            {sync.pending} scan{sync.pending === 1 ? "" : "s"} waiting to sync
          </StatusBanner>
        ) : null}
      </div>

      <div className="relative flex-1 overflow-hidden bg-neutral-900">
        {cameraError ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center">
            <div>
              <div className="text-[14px]">{cameraError}</div>
              <Button variant="secondary" className="mt-3" onClick={() => setManual(true)}>
                Enter code manually
              </Button>
            </div>
          </div>
        ) : (
          <Camera ref={camera} active={!manual} onDecode={handle} onError={setCameraError} className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        )}
        <div className="viewfinder pointer-events-none absolute left-[52px] right-[52px] top-1/2 aspect-square -translate-y-1/2">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-[18px] text-center text-[13px] text-neutral-300">Point at the ticket QR</div>
      </div>

      <div className="border-t border-divider bg-bg px-[18px] pb-[calc(22px+env(safe-area-inset-bottom))] pt-3.5">
        <div className="flex gap-[9px]">
          <Button variant="secondary" className="flex-1" onClick={() => setManual(true)}>
            Enter code manually
          </Button>
          <Button
            variant="secondary"
            size="icon"
            aria-label="Torch"
            aria-pressed={torch}
            disabled={!camera.current?.torchSupported}
            onClick={async () => setTorch((await camera.current?.toggleTorch()) ?? false)}
          >
            <Flashlight size={18} weight={torch ? "fill" : "regular"} />
          </Button>
        </div>
        <div className="mt-[9px] flex justify-between text-[11.5px] text-neutral-500">
          <span>
            {sync.lastSyncAt ? `Last sync ${formatRelative(sync.lastSyncAt)}` : sync.online ? "Synced" : "Never synced"} · {scansToday} scan{scansToday === 1 ? "" : "s"} today
          </span>
          <span>
            {sync.rosterCount} on roster{sync.rosterRefreshedAt ? ` · ${formatRelative(sync.rosterRefreshedAt)}` : ""}
          </span>
        </div>
      </div>

      <Dialog open={manual} onOpenChange={setManual}>
        <DialogContent title="Enter ticket code" description="Printed under the QR on the participant's pass.">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setManual(false);
              void handle(manualCode);
              setManualCode("");
            }}
            className="flex flex-col gap-3"
          >
            <Input value={manualCode} onChange={(e) => setManualCode(e.target.value.toUpperCase())} placeholder="FF-XXXXXXXXXX" className="code text-[15px] tracking-[0.12em]" autoFocus autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
            <DialogActions>
              <Button type="submit" variant="primary" disabled={!parseTicketCode(manualCode)}>
                Check
              </Button>
            </DialogActions>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
};

/** Dark chrome header used by every scanner state. */
const Shell = ({ title, sub, mode, bare, children }: { title: string; sub: string; mode?: Mode; bare?: boolean; children: React.ReactNode }) => (
  <div className="flex min-h-dvh flex-col bg-bg">
    <div className="bg-neutral-900 px-[18px] pb-3 pt-[calc(10px+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[16px] font-medium">{title}</div>
          <div className="truncate text-[11.5px] text-neutral-500">{sub}</div>
        </div>
        {mode ? <Tag tone="outline">{mode === "meal" ? "Meal mode" : "Entry mode"}</Tag> : <Link href="/admin" className="btn btn-ghost text-[12px]">Admin</Link>}
      </div>
    </div>
    {bare ? children : <div className="flex-1">{children}</div>}
  </div>
);
