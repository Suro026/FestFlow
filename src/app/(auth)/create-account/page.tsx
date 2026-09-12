"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { passwordsMatch, studentSignUpFields } from "@/core/models/user";
import { AuthError } from "@/core/services/auth-service";
import { useAuth, useRepositories } from "@/components/providers";
import { AuthHeading } from "@/components/auth/auth-heading";
import { CheckOption, Field, Input, NativeSelect } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { safeRedirect } from "@/lib/utils";

/**
 * Student sign-up.
 *
 * Only students self-register; every other role is invite-only. The consent
 * line is not decoration — the PRD's DPDP requirement is a stated purpose and
 * consent at sign-up, and this is where it lives.
 */
const formSchema = studentSignUpFields
  .extend({
    consent: z.literal(true, { message: "You need to agree before continuing" }),
  })
  .refine((data) => data.password === data.confirmPassword, passwordsMatch);

type FormValues = z.input<typeof formSchema>;

export default function CreateAccountPage() {
  const { auth } = useAuth();
  const repos = useRepositories();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "");
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      college: "",
      studentId: "",
      department: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await auth.signUp(values.email, values.password, values.fullName);

      await repos.users.createStudentProfile({
        id: session.uid,
        email: session.email,
        fullName: values.fullName,
        phone: values.phone,
        studentId: values.studentId,
        college: values.college,
        department: values.department || undefined,
        year: values.year ? Number(values.year) : undefined,
        emailVerified: false,
      });

      // If a teammate entered this address before the account existed, claim
      // those entries now so certificates can reach the right person.
      repos.registrations.linkMemberAccountsByEmail().catch(() => undefined);

      router.replace(next ? `/verify-email?next=${encodeURIComponent(next)}` : "/verify-email");
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "Something went wrong. Please try again.");
    }
  });

  const err = form.formState.errors;

  return (
    <>
      <AuthHeading
        kick="Students"
        title="Create your account"
        sub="One account for every fest you attend. Tickets, meal slots and certificates all land here."
      />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Full name" htmlFor="fullName" error={err.fullName?.message} hint="As it should appear on certificates.">
          <Input id="fullName" autoComplete="name" invalid={Boolean(err.fullName)} {...form.register("fullName")} />
        </Field>

        <Field label="Email" htmlFor="email" error={err.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@college.edu" invalid={Boolean(err.email)} {...form.register("email")} />
        </Field>

        <Field label="Phone" htmlFor="phone" error={err.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91" invalid={Boolean(err.phone)} {...form.register("phone")} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="College" htmlFor="college" error={err.college?.message}>
            <Input id="college" autoComplete="organization" invalid={Boolean(err.college)} {...form.register("college")} />
          </Field>
          <Field label="College ID" htmlFor="studentId" error={err.studentId?.message}>
            <Input id="studentId" placeholder="RA2211003010" invalid={Boolean(err.studentId)} {...form.register("studentId")} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Department (optional)" htmlFor="department" error={err.department?.message}>
            <Input id="department" placeholder="CSE" {...form.register("department")} />
          </Field>
          <Field label="Year (optional)" htmlFor="year" error={err.year?.message}>
            <NativeSelect id="year" {...form.register("year", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={err.password?.message} hint="8+ characters, a capital and a number.">
            <Input id="password" type="password" autoComplete="new-password" invalid={Boolean(err.password)} {...form.register("password")} />
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" error={err.confirmPassword?.message}>
            <Input id="confirmPassword" type="password" autoComplete="new-password" invalid={Boolean(err.confirmPassword)} {...form.register("confirmPassword")} />
          </Field>
        </div>

        <div>
          <CheckOption
            label={
              <span className="text-[13px] text-neutral-300">
                I agree that FestFlow shares my name, email and college with the organizers of fests I register for, so they
                can issue tickets and certificates.
              </span>
            }
            {...form.register("consent")}
          />
          {err.consent ? (
            <div className="field-error" role="alert">
              {err.consent.message as string}
            </div>
          ) : null}
        </div>

        {formError ? (
          <div role="alert" className="rounded-md px-3 py-2.5 text-[13px] text-neutral-200 shadow-[inset_0_0_0_1px_var(--color-danger)]">
            {formError}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting} className="mt-1">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-neutral-500">
        Already have one? <Link href={next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"}>Sign in</Link>
      </p>
    </>
  );
}
