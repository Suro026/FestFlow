"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { emailSchema } from "@/core/models/common";
import { AuthError } from "@/core/services/auth-service";
import { useAuth } from "@/components/providers";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { MetaList, MetaRow } from "@/components/ui/primitives";

const schema = z.object({ email: emailSchema });

export default function ForgotPasswordPage() {
  const { auth } = useAuth();
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<z.input<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await auth.sendPasswordReset(email);
      setSentTo(email);
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "Something went wrong. Please try again.");
    }
  });

  if (sentTo) {
    return (
      <>
        <AuthHeading kick="Check your inbox" title="Reset link sent" />
        <MetaList className="mb-6">
          <MetaRow label="Sent to">{sentTo}</MetaRow>
          <MetaRow label="Expires">In one hour</MetaRow>
          <MetaRow label="Nothing there?">Check spam, or try again</MetaRow>
        </MetaList>
        <p className="mb-6 max-w-[44ch] text-[13px] text-neutral-500">
          If that address has an account, the link is on its way. We say the same thing either way, so nobody can use
          this page to find out who has signed up.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setSentTo(null)}>
            Use a different email
          </Button>
          <Button asChild variant="ghost">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        kick="Account"
        title="Forgot your password?"
        sub="Enter the address you signed up with and we'll send a link to set a new one."
      />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input id="email" type="email" autoComplete="email" inputMode="email" invalid={Boolean(form.formState.errors.email)} {...form.register("email")} />
        </Field>
        {formError ? (
          <div role="alert" className="rounded-md px-3 py-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--color-danger)]">
            {formError}
          </div>
        ) : null}
        <Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting} className="mt-1">
          Send reset link
        </Button>
      </form>
      <p className="mt-6 text-[13px] text-neutral-500">
        Remembered it? <Link href="/sign-in">Sign in</Link>
      </p>
    </>
  );
}
