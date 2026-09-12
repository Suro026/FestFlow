"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { Event } from "@/core/models/event";
import type { Fest } from "@/core/models/fest";
import { emailSchema, shortTextSchema, RepositoryError } from "@/core/models/common";
import { validateRegistration } from "@/core/models/registration";
import { useAuth, useRepositories } from "@/components/providers";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/overlays";
import { Kick, MetaRow, Tag } from "@/components/ui/primitives";
import { formatTeamSize } from "@/lib/utils";

/**
 * The registration form — 2a's sheet.
 *
 * The leader is always the signed-in student and is filled from their
 * profile; teammates are entered by name and email. Team-size rules come from
 * the event, never from a constant, and the same `validateRegistration` runs
 * here for instant feedback and again on the server for the real decision.
 */

const memberSchema = z.object({
  name: shortTextSchema,
  email: emailSchema,
});

const schema = z.object({
  teamName: z.string().trim().max(200).optional(),
  members: z.array(memberSchema).min(1),
});

type FormValues = z.input<typeof schema>;

export interface RegistrationFormProps {
  event: Event;
  fest: Fest;
  onDone?: () => void;
}

export const RegistrationForm = ({ event, fest, onDone }: RegistrationFormProps) => {
  const { session, profile } = useAuth();
  const repos = useRepositories();
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);

  const isTeam = event.eventType === "team";
  const leader = {
    name: profile?.fullName ?? session?.displayName ?? "",
    email: profile?.email ?? session?.email ?? "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      teamName: "",
      // Start with the leader plus enough blank rows to reach the minimum.
      members: [leader, ...Array.from({ length: Math.max(0, event.teamSize.min - 1) }, () => ({ name: "", email: "" }))],
    },
  });

  const members = useFieldArray({ control: form.control, name: "members" });
  const count = members.fields.length;
  const canAdd = isTeam && count < event.teamSize.max;
  const needMore = isTeam ? Math.max(0, event.teamSize.min - count) : 0;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);

    const input = {
      eventId: event.id,
      teamName: isTeam ? values.teamName?.trim() : undefined,
      members: values.members.map((m, i) => ({
        name: m.name.trim(),
        email: m.email.trim().toLowerCase(),
        ...(i === 0 && profile?.student ? { studentId: profile.student.studentId, college: profile.student.college } : {}),
      })),
    };

    const check = validateRegistration(input, event);
    if (!check.ok) {
      setFormError(check.message);
      return;
    }

    try {
      const registration = await repos.registrations.create(input);
      toast.success("You're in");
      onDone?.();
      router.push(`/registered/${registration.id}`);
    } catch (error) {
      const message =
        error instanceof RepositoryError
          ? error.code === "already-exists"
            ? "You already hold an entry for this event. Find it under My events."
            : error.message
          : "Something went wrong. Please try again.";
      setFormError(message);
    }
  });

  const err = form.formState.errors;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      {isTeam ? (
        <Field label="Team name" htmlFor="teamName" error={err.teamName?.message} className="mb-3">
          <Input id="teamName" placeholder="Null Pointers" autoComplete="off" invalid={Boolean(err.teamName)} {...form.register("teamName")} />
        </Field>
      ) : null}

      <Kick className="mb-2">{isTeam ? "Members" : "Registering"}</Kick>

      <div className="flex flex-col gap-[9px]">
        {members.fields.map((field, index) => {
          const isLeader = index === 0;
          const memberErr = err.members?.[index];

          if (isLeader) {
            return (
              <div key={field.id} className="panel flex items-center gap-[9px] p-2.5">
                <Avatar name={leader.name} src={profile?.photoUrl} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px]">{leader.name || "You"}</div>
                  <div className="truncate text-[11px] text-neutral-500">{leader.email}</div>
                </div>
                <Tag tone="outline">{isTeam ? "Leader" : "You"}</Tag>
                <input type="hidden" {...form.register(`members.${index}.name`)} />
                <input type="hidden" {...form.register(`members.${index}.email`)} />
              </div>
            );
          }

          return (
            <div key={field.id} className="panel flex flex-col gap-2 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-neutral-500">Teammate {index + 1}</span>
                {count > event.teamSize.min ? (
                  <button type="button" className="btn btn-ghost text-[12px]" onClick={() => members.remove(index)}>
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field error={memberErr?.name?.message}>
                  <Input placeholder="Full name" autoComplete="off" invalid={Boolean(memberErr?.name)} {...form.register(`members.${index}.name`)} />
                </Field>
                <Field error={memberErr?.email?.message}>
                  <Input type="email" inputMode="email" placeholder="name@college.edu" autoComplete="off" invalid={Boolean(memberErr?.email)} {...form.register(`members.${index}.email`)} />
                </Field>
              </div>
            </div>
          );
        })}

        {canAdd ? (
          <button
            type="button"
            className="panel flex items-center gap-2 px-3 py-2.5 text-left text-[13px] text-neutral-500 hover:text-text"
            onClick={() => members.append({ name: "", email: "" })}
          >
            <span className="grid h-6 w-6 place-items-center rounded-sm shadow-[inset_0_0_0_1px_var(--color-divider)]">+</span>
            Add a teammate
          </button>
        ) : null}
      </div>

      {isTeam ? (
        <div className="mt-3 text-[12px] text-accent-300">
          {needMore > 0
            ? `This event needs at least ${event.teamSize.min} team members — add ${needMore} more.`
            : count < event.teamSize.max
              ? `You can add ${event.teamSize.max - count} more later.`
              : `That's the full team of ${event.teamSize.max}.`}
        </div>
      ) : null}

      {formError ? (
        <div role="alert" className="mt-3 rounded-md px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-danger)]">
          {formError}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2">
        <MetaRow label="Fest pass" className="bg-none pb-2.5 pt-0">
          {fest.name} · signed in
        </MetaRow>
        <MetaRow label="Entry" className="bg-none py-0 pb-2.5">
          {event.entryFee > 0 ? `₹${event.entryFee.toLocaleString("en-IN")}` : "Free"} · {formatTeamSize(event.eventType, event.teamSize)}
        </MetaRow>
        <Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting} disabled={needMore > 0}>
          Confirm registration
        </Button>
      </div>
    </form>
  );
};
