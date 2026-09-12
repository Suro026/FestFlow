"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AdminPage, useFest } from "@/components/shell/admin-shell";
import { useAdminEvent } from "@/components/admin/event-context";
import { useAuth, useRepositories } from "@/components/providers";
import {
  BasicsFields,
  CoordinatorsFields,
  RegistrationFields,
  ScanningFields,
  eventFormSchema,
  fromEvent,
  toUpdateEvent,
  useEventForm,
} from "@/components/admin/event-form";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from "@/components/ui/overlays";
import { Kick, MetaList, MetaRow, PageHeading, Tag } from "@/components/ui/primitives";
import { RepositoryError } from "@/core/models/common";
import { hasAtLeast } from "@/core/models/user";
import { formatCalendarDate } from "@/lib/utils";

const SECTIONS = [
  { id: "details", label: "Details" },
  { id: "registration", label: "Registration" },
  { id: "scanning", label: "Scanning & meals" },
  { id: "certificates", label: "Certificates" },
  { id: "coordinators", label: "Coordinators" },
  { id: "danger", label: "Danger zone" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

/** 4e — Event settings. Side nav of sections, the same form fields as the wizard, and the danger zone. */
export default function EventSettingsPage() {
  const { fest, basePath } = useFest();
  const { event, eventPath } = useAdminEvent();
  const { session } = useAuth();
  const repos = useRepositories();
  const router = useRouter();

  const [section, setSection] = React.useState<Section>("details");
  const form = useEventForm(fromEvent(event));
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<"unpublish" | "cancel" | "delete" | null>(null);

  // Live edits from elsewhere (another admin) refresh the form when not dirty.
  React.useEffect(() => {
    if (!form.formState.isDirty) form.reset(fromEvent(event));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.updatedAt.getTime()]);

  const save = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast.error("Some fields need fixing");
      return;
    }
    setSaving(true);
    try {
      await repos.events.update(event.id, toUpdateEvent(eventFormSchema.parse(form.getValues())));
      toast.success("Saved");
      form.reset(form.getValues());
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: "published" | "draft" | "cancelled" | "ongoing" | "completed", label: string) => {
    setBusy(status);
    try {
      await repos.events.setStatus(event.id, status);
      toast.success(label);
      setConfirm(null);
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("delete");
    try {
      await repos.events.delete(event.id);
      toast.success("Event deleted");
      router.push(`${basePath}/events`);
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "Couldn't delete");
      setBusy(null);
      setConfirm(null);
    }
  };

  const isAdmin = session ? hasAtLeast(session.role, "admin") : false;
  const hasEntries = event.registeredCount > 0;
  const dirty = form.formState.isDirty;

  return (
    <AdminPage className="grid gap-0 pb-8 lg:grid-cols-[176px_1fr]">
      {/* Section nav */}
      <div className="flex gap-1 overflow-x-auto py-4 scrollbar-none lg:flex-col lg:gap-[3px] lg:border-r lg:border-divider lg:py-[22px] lg:pr-[18px]">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={`whitespace-nowrap rounded-sm px-[9px] py-[7px] text-left text-[13px] ${
              section === s.id ? "text-accent shadow-[inset_0_0_0_1px_var(--color-accent)]" : "text-neutral-500 hover:text-text"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="pt-6 lg:pl-7">
        <PageHeading
          title="Event settings"
          sub={`${event.title} · ${event.status} · ${event.registeredCount} registered`}
          actions={
            <>
              {event.status === "ongoing" ? <Tag tone="accent">Ongoing</Tag> : null}
              {dirty ? (
                <Button variant="primary" onClick={save} loading={saving}>
                  Save changes
                </Button>
              ) : null}
            </>
          }
          className="mb-5"
        />

        <form onSubmit={(e) => e.preventDefault()} noValidate>
          {section === "details" ? <BasicsFields form={form} lockSlug={hasEntries} /> : null}

          {section === "registration" ? (
            <div className="flex flex-col gap-6">
              <MetaList>
                <MetaRow label="Capacity">
                  {event.capacity > 0 ? `${event.capacity} seats` : "Unlimited"} · raising is safe
                  {hasEntries ? `, lowering below ${event.registeredCount} is refused` : ""}
                </MetaRow>
                <MetaRow label="Waitlist">{event.waitlistEnabled ? "On · auto-promote when a seat frees" : "Off"}</MetaRow>
                <MetaRow label="Team size">
                  {event.eventType === "team" ? `${event.teamSize.min}–${event.teamSize.max}` : "Solo"}
                  {hasEntries ? " · locked once a team registers" : ""}
                </MetaRow>
                <MetaRow label="Closes">{event.registrationDeadline ? `${formatCalendarDate(event.registrationDeadline)}, 23:59` : "With the event"}</MetaRow>
              </MetaList>
              <RegistrationFields form={form} locked={{ teamSize: hasEntries, minCapacity: hasEntries ? event.registeredCount : undefined }} />
            </div>
          ) : null}

          {section === "scanning" ? (
            <div className="flex flex-col gap-6">
              <MetaList>
                <MetaRow label="Gates">{event.gates.length ? event.gates.join(", ") : "None named yet"}</MetaRow>
                <MetaRow label="Meal slots">{event.mealSlots.length ? event.mealSlots.map((m) => m.label).join(" · ") : "None"}</MetaRow>
                <MetaRow label="Re-scan">Refused with the original timestamp shown</MetaRow>
              </MetaList>
              <ScanningFields form={form} />
            </div>
          ) : null}

          {section === "certificates" ? (
            <div className="flex flex-col gap-4">
              <MetaList>
                <MetaRow label="Participation">Issued to every checked-in entry once the event is completed</MetaRow>
                <MetaRow label="Winner">Issued from the published result sheet</MetaRow>
                <MetaRow label="Results">{event.resultsPublishedAt ? `Published ${formatCalendarDate(event.resultsPublishedAt.toISOString().slice(0, 10))}` : "Not published yet"}</MetaRow>
              </MetaList>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary">
                  <a href={`${eventPath}/results`}>Manage results</a>
                </Button>
                <Button asChild variant="primary">
                  <a href={`${basePath}/certificates`}>Certificate center</a>
                </Button>
              </div>
            </div>
          ) : null}

          {section === "coordinators" ? <CoordinatorsFields form={form} /> : null}

          {section === "danger" ? (
            <div className="rounded-md p-[17px] shadow-[inset_0_0_0_1px_var(--color-neutral-700)]">
              <div className="mb-1.5 text-[14px]">Danger zone</div>
              <div className="mb-3.5 text-[12.5px] text-neutral-400">
                {hasEntries
                  ? `Cancelling notifies all ${event.registeredCount} registrations and revokes their tickets. Registrations and scan history are kept for the college record. Deleting is not possible while entries exist.`
                  : "This event has no registrations yet, so it can be unpublished, cancelled or deleted outright."}
              </div>
              <div className="flex flex-wrap gap-2">
                {event.status === "draft" ? (
                  <Button variant="primary" onClick={() => setStatus("published", "Event published")} loading={busy === "published"}>
                    Publish
                  </Button>
                ) : null}
                {event.status === "published" ? (
                  <Button variant="secondary" onClick={() => setStatus("ongoing", "Marked ongoing")} loading={busy === "ongoing"}>
                    Mark ongoing
                  </Button>
                ) : null}
                {event.status === "ongoing" ? (
                  <Button variant="secondary" onClick={() => setStatus("completed", "Marked completed — certificates can now be issued")} loading={busy === "completed"}>
                    Mark completed
                  </Button>
                ) : null}
                {event.status === "published" || event.status === "ongoing" ? (
                  <AlertDialog open={confirm === "unpublish"} onOpenChange={(o) => setConfirm(o ? "unpublish" : null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="secondary">Unpublish</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent
                      title="Unpublish this event?"
                      description="It disappears from the fest page and registration closes. Existing entries stay valid."
                      confirmLabel="Unpublish"
                      loading={busy === "draft"}
                      onConfirm={() => setStatus("draft", "Event unpublished")}
                    />
                  </AlertDialog>
                ) : null}
                {event.status !== "cancelled" && event.status !== "completed" ? (
                  <AlertDialog open={confirm === "cancel"} onOpenChange={(o) => setConfirm(o ? "cancel" : null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="secondary">Cancel event</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent
                      title="Cancel this event?"
                      description={`${event.registeredCount} ticket holders will be notified and their tickets revoked. This can't be undone.`}
                      confirmLabel="Cancel event"
                      destructive
                      loading={busy === "cancelled"}
                      onConfirm={() => setStatus("cancelled", "Event cancelled")}
                    />
                  </AlertDialog>
                ) : null}
                {isAdmin && !hasEntries ? (
                  <AlertDialog open={confirm === "delete"} onOpenChange={(o) => setConfirm(o ? "delete" : null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="danger">Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent
                      title="Delete this event?"
                      description="Gone for good. Only possible because nobody has registered."
                      confirmLabel="Delete event"
                      destructive
                      loading={busy === "delete"}
                      onConfirm={remove}
                    />
                  </AlertDialog>
                ) : null}
              </div>
              <div className="mt-4">
                <Kick className="mb-1">Fest</Kick>
                <div className="text-[12.5px] text-neutral-500">
                  {fest.name} · {fest.organizationName}
                </div>
              </div>
            </div>
          ) : null}
        </form>

        {dirty && section !== "danger" && section !== "certificates" ? (
          <div className="mt-6 flex gap-2">
            <Button variant="primary" onClick={save} loading={saving}>
              Save changes
            </Button>
            <Button variant="secondary" onClick={() => form.reset(fromEvent(event))}>
              Discard
            </Button>
          </div>
        ) : null}
      </div>
    </AdminPage>
  );
}
