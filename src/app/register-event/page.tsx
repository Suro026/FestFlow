"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "@/components/providers";
import { PublicFooter, PublicNav } from "@/components/shell/public-nav";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Kick, Note, Skeleton, Tag } from "@/components/ui/primitives";
import {
  FEST_TYPE_LABELS,
  FEST_TYPES,
  ORGANIZATION_TYPE_LABELS,
  ORGANIZATION_TYPES,
  registerEventSchema,
  type Fest,
  type RegisterEvent,
  type RegisterEventInput,
} from "@/core/models/fest";
import { api, apiUpload, ApiClientError } from "@/data/api-client";
import { firebaseAuth } from "@/data/firebase/client";

/**
 * The self-service onboarding page: `POST /api/register-event` creates the
 * fest and promotes the caller to its admin in one request. No approval, no
 * invitation, no pending state — the three-step wizard below is everything
 * that happens before that.
 */
export default function RegisterEventPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicNav active="colleges" />
      <main id="main" className="mx-auto w-full max-w-[680px] flex-1 px-[18px] pb-16 pt-8 sm:px-6 sm:pt-14">
        <div className="mb-[18px] flex flex-wrap gap-2">
          <Tag tone="accent">Register your event</Tag>
        </div>
        <h1 className="mb-3 text-[34px] leading-[1.05] tracking-[-0.03em] sm:text-[42px]">
          You&apos;re already in charge.
        </h1>
        <p className="mb-8 max-w-[54ch] text-[15px] text-neutral-300">
          No approval queue. The second you finish this, you&apos;re its admin — build your team, open registrations, and run it live.
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

  return <RegisterEventWizard />;
};

const STEPS = [
  { n: 1, label: "Organization" },
  { n: 2, label: "Event" },
  { n: 3, label: "Event head" },
] as const;

type Step = (typeof STEPS)[number]["n"];

const STEP_FIELDS: Record<Step, Path<RegisterEventInput>[]> = {
  1: ["organizationName", "organizationType", "organizationWebsite", "contactEmail", "city", "state"],
  2: ["name", "festType", "startDate", "endDate", "venue", "expectedParticipants", "description"],
  3: ["eventHead.name", "eventHead.designation", "eventHead.phone", "eventHead.linkedin"],
};

const StepIndicator = ({ step }: { step: Step }) => (
  <div className="mb-6 flex items-center gap-2">
    {STEPS.map((s, i) => (
      <React.Fragment key={s.n}>
        {i > 0 ? <div className="h-px w-6 bg-divider" aria-hidden /> : null}
        <div className={`flex items-center gap-1.5 text-[12.5px] ${s.n === step ? "text-text" : s.n < step ? "text-accent-300" : "text-neutral-500"}`}>
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border text-[11px] ${
              s.n === step ? "border-accent-300 text-accent-300" : s.n < step ? "border-accent-300 bg-accent-300/10 text-accent-300" : "border-divider"
            }`}
          >
            {s.n}
          </span>
          {s.label}
        </div>
      </React.Fragment>
    ))}
  </div>
);

const RegisterEventWizard = () => {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [uploading, setUploading] = React.useState(false);
  const [idCardName, setIdCardName] = React.useState<string | null>(null);

  const form = useForm<RegisterEventInput, unknown, RegisterEvent>({
    resolver: zodResolver(registerEventSchema),
    defaultValues: {
      organizationName: "",
      organizationType: "college",
      organizationWebsite: "",
      contactEmail: "",
      city: "",
      state: "",
      name: "",
      festType: "other",
      startDate: "",
      endDate: "",
      venue: "",
      expectedParticipants: "" as unknown as number,
      description: "",
      eventHead: { name: "", designation: "", phone: "", idCardUrl: "", linkedin: "" },
    },
  });
  const err = form.formState.errors;

  const register = useMutation({
    mutationFn: (input: RegisterEvent) => api<{ fest: Fest }>("/api/register-event", { method: "POST", body: input }),
  });

  const next = async () => {
    const valid = await form.trigger(STEP_FIELDS[step]);
    if (!valid) return;
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s));

  const onIdCardChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await apiUpload<{ url: string }>("/api/uploads?kind=eventHeadIdentity", file);
      form.setValue("eventHead.idCardUrl", uploaded.url, { shouldValidate: true });
      setIdCardName(file.name);
      toast.success("Uploaded");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "Couldn't upload that file");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeIdCard = () => {
    form.setValue("eventHead.idCardUrl", undefined, { shouldValidate: true });
    setIdCardName(null);
  };

  const submit = form.handleSubmit(async (values) => {
    try {
      const payload: RegisterEvent = {
        ...values,
        organizationWebsite: values.organizationWebsite || undefined,
        description: values.description || undefined,
        eventHead: { ...values.eventHead, linkedin: values.eventHead.linkedin || undefined, idCardUrl: values.eventHead.idCardUrl || undefined },
      };
      const { fest } = await register.mutateAsync(payload);

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
      <StepIndicator step={step} />

      {step === 1 ? (
        <>
          <Field label="Organization name" htmlFor="re-org-name" error={err.organizationName?.message}>
            <Input id="re-org-name" placeholder="Bits Institute of Technology" {...form.register("organizationName")} />
          </Field>
          <Field label="Organization type" htmlFor="re-org-type" error={err.organizationType?.message}>
            <NativeSelect id="re-org-type" {...form.register("organizationType")}>
              {ORGANIZATION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {ORGANIZATION_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Official website (optional)" htmlFor="re-org-site" error={err.organizationWebsite?.message} hint="Include https://">
            <Input id="re-org-site" type="url" placeholder="https://college.edu" {...form.register("organizationWebsite")} />
          </Field>
          <Field label="Official email" htmlFor="re-org-email" error={err.contactEmail?.message}>
            <Input id="re-org-email" type="email" placeholder="events@college.edu" {...form.register("contactEmail")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="re-city" error={err.city?.message}>
              <Input id="re-city" placeholder="Chennai" {...form.register("city")} />
            </Field>
            <Field label="State" htmlFor="re-state" error={err.state?.message}>
              <Input id="re-state" placeholder="Tamil Nadu" {...form.register("state")} />
            </Field>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Field label="Event name" htmlFor="re-name" error={err.name?.message}>
            <Input id="re-name" placeholder="Aurora '26" {...form.register("name")} />
          </Field>
          <Field label="Event type" htmlFor="re-type" error={err.festType?.message}>
            <NativeSelect id="re-type" {...form.register("festType")}>
              {FEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FEST_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" htmlFor="re-start" error={err.startDate?.message}>
              <Input id="re-start" type="date" {...form.register("startDate")} />
            </Field>
            <Field label="Ends" htmlFor="re-end" error={err.endDate?.message}>
              <Input id="re-end" type="date" {...form.register("endDate")} />
            </Field>
          </div>
          <Field label="Venue" htmlFor="re-venue" error={err.venue?.message}>
            <Input id="re-venue" placeholder="Main campus" {...form.register("venue")} />
          </Field>
          <Field label="Expected participants" htmlFor="re-participants" error={err.expectedParticipants?.message}>
            <Input id="re-participants" type="number" min={1} placeholder="500" {...form.register("expectedParticipants")} />
          </Field>
          <Field label="Description (optional)" htmlFor="re-desc" error={err.description?.message}>
            <Textarea id="re-desc" rows={3} placeholder="A three-day tech and culture fest with 40+ events." {...form.register("description")} />
          </Field>
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Field label="Full name" htmlFor="re-eh-name" error={err.eventHead?.name?.message}>
            <Input id="re-eh-name" placeholder="Meena R. Kumar" {...form.register("eventHead.name")} />
          </Field>
          <Field label="Designation" htmlFor="re-eh-desig" error={err.eventHead?.designation?.message}>
            <Input id="re-eh-desig" placeholder="Cultural Secretary" {...form.register("eventHead.designation")} />
          </Field>
          <Field label="Phone number" htmlFor="re-eh-phone" error={err.eventHead?.phone?.message}>
            <Input id="re-eh-phone" type="tel" placeholder="+91 90000 00000" {...form.register("eventHead.phone")} />
          </Field>
          <Field label="LinkedIn (optional)" htmlFor="re-eh-linkedin" error={err.eventHead?.linkedin?.message}>
            <Input id="re-eh-linkedin" type="url" placeholder="https://linkedin.com/in/…" {...form.register("eventHead.linkedin")} />
          </Field>
          <Field label="ID card or authorization letter (optional)" htmlFor="re-eh-id" hint="A photo of your ID, or a PDF letter from your organization.">
            {idCardName ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-divider px-3 py-2 text-[13px]">
                <span className="truncate">{idCardName}</span>
                <button type="button" className="btn btn-ghost text-[12px]" onClick={removeIdCard}>
                  Remove
                </button>
              </div>
            ) : (
              <Input id="re-eh-id" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={onIdCardChange} disabled={uploading} />
            )}
            {uploading ? <div className="mt-1.5 text-[12px] text-neutral-500">Uploading…</div> : null}
          </Field>
        </>
      ) : null}

      <div className="mt-2 flex items-center justify-between gap-3">
        <div>
          {step > 1 ? (
            <Button type="button" variant="secondary" onClick={back}>
              Back
            </Button>
          ) : null}
        </div>
        {step < 3 ? (
          <Button type="button" variant="primary" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button type="submit" variant="primary" loading={register.isPending} disabled={uploading}>
            Register Your Event
          </Button>
        )}
      </div>
      <div className="text-[12px] text-neutral-500">
        <Kick className="inline">Step {step} of 3</Kick>
      </div>
    </form>
  );
};
