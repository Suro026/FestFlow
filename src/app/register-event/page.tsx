"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Note, Skeleton, Tag } from "@/components/ui/primitives";
import { FEST_TYPE_LABELS, FEST_TYPES, registerEventSchema, type Fest, type RegisterEvent } from "@/core/models/fest";
import { api, ApiClientError } from "@/data/api-client";
import { firebaseAuth } from "@/data/firebase/client";

/**
 * The self-service onboarding page: `POST /api/register-event` creates the
 * fest and promotes the caller to its admin in one request. No approval, no
 * invitation — the visitor is signed in (or not) and everything past that is
 * theirs to fill in.
 */
export default function RegisterEventPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav active="colleges" />
      <main id="main" className="mx-auto w-full max-w-[620px] flex-1 px-[18px] pb-16 pt-8 sm:px-6 sm:pt-14">
        <div className="mb-[18px] flex flex-wrap gap-2">
          <Tag tone="accent">Register your event</Tag>
        </div>
        <h1 className="mb-3 text-[34px] leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
          You&apos;re already in charge.
        </h1>
        <p className="mb-8 max-w-[52ch] text-[15px] text-neutral-300">
          No approval queue. The second you register, you&apos;re its admin — build your team, open registrations, and run it live.
        </p>
        <Gate />
      </main>
      <PublicFooter />
    </div>
  );
}

const Gate = () => {
  const { status, session } = useAuth();

  if (status === "loading") return <Skeleton className="h-72" />;

  if (status === "signed-out" || !session) {
    return (
      <Note title="Sign in to register your event">
        One account for everything on Plansphere — sign in, or create one in a minute, and you&apos;ll land right back here.
        <div className="mt-3.5">
          <Button asChild variant="primary">
            <Link href="/sign-in?next=/register-event">Sign in or create an account</Link>
          </Button>
        </div>
      </Note>
    );
  }

  return <RegisterEventForm />;
};

const RegisterEventForm = () => {
  const router = useRouter();
  const form = useForm<RegisterEvent>({
    resolver: zodResolver(registerEventSchema),
    defaultValues: { name: "", description: "", festType: "other", startDate: "", endDate: "" },
  });
  const err = form.formState.errors;

  const register = useMutation({
    mutationFn: (input: RegisterEvent) => api<{ fest: Fest }>("/api/register-event", { method: "POST", body: input }),
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      const { fest } = await register.mutateAsync({ ...values, description: values.description || undefined });

      // The promotion to admin just landed in Firestore; the ID token this
      // browser is holding still says the old role until refreshed. Without
      // this, the very next authenticated call — loading the admin console —
      // would see the caller as they were a moment ago, not as they are now.
      await firebaseAuth().currentUser?.getIdToken(true);

      toast.success(`${fest.name} is registered — you're its admin`);
      router.push(`/admin/${fest.slug}/overview`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Couldn't register the event");
    }
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Field label="Event name" htmlFor="re-name" error={err.name?.message}>
        <Input id="re-name" placeholder="Aurora '26" {...form.register("name")} />
      </Field>
      <Field label="What is it?" htmlFor="re-type" error={err.festType?.message}>
        <NativeSelect id="re-type" {...form.register("festType")}>
          {FEST_TYPES.map((t) => (
            <option key={t} value={t}>
              {FEST_TYPE_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Description (optional)" htmlFor="re-desc" error={err.description?.message}>
        <Textarea id="re-desc" rows={3} placeholder="A three-day tech and culture fest with 40+ events." {...form.register("description")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="re-start" error={err.startDate?.message}>
          <Input id="re-start" type="date" {...form.register("startDate")} />
        </Field>
        <Field label="Ends" htmlFor="re-end" error={err.endDate?.message}>
          <Input id="re-end" type="date" {...form.register("endDate")} />
        </Field>
      </div>
      <div className="mt-1 text-[12px] text-neutral-500">
        You can fill in the venue, city, artwork and everything else from your fest&apos;s settings right after — this is just enough to get it created.
      </div>
      <Button type="submit" variant="primary" block loading={register.isPending}>
        Register Your Event
      </Button>
    </form>
  );
};
