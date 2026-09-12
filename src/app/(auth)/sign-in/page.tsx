"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInSchema, type SignIn } from "@/core/models/user";
import { AuthError } from "@/core/services/auth-service";
import { useAuth } from "@/components/providers";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { homeFor } from "@/components/shell/require-role";
import { safeRedirect } from "@/lib/utils";

/**
 * One sign-in for everyone. Where you land afterwards depends on the role on
 * your token, not on which page you used — the design's console text says it
 * plainly: "Admins sign in through the normal login page".
 */
export default function SignInPage() {
  const { auth, status, session } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeRedirect(params.get("next"), "");
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<SignIn>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  // Already signed in — send them where they were going, or home.
  React.useEffect(() => {
    if (status === "signed-in" && session) router.replace(next || homeFor(session.role));
  }, [status, session, next, router]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      const created = await auth.signIn(values.email, values.password);
      router.replace(next || homeFor(created.role));
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "Something went wrong. Please try again.");
    }
  });

  return (
    <>
      <AuthHeading kick="Welcome back" title="Sign in" sub="Students, organizers and admins all sign in here." />

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Email" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@college.edu"
            invalid={Boolean(form.formState.errors.email)}
            {...form.register("email")}
          />
        </Field>

        <Field
          label="Password"
          htmlFor="password"
          error={form.formState.errors.password?.message}
          labelEnd={
            <Link href="/forgot-password" className="text-[12px] no-underline hover:underline">
              Forgot?
            </Link>
          }
        >
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(form.formState.errors.password)}
            {...form.register("password")}
          />
        </Field>

        {formError ? (
          <div role="alert" className="rounded-md px-3 py-2.5 text-[13px] text-neutral-200 shadow-[inset_0_0_0_1px_var(--color-danger)]">
            {formError}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" block loading={form.formState.isSubmitting} className="mt-1">
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-[13px] text-neutral-500">
        New to FestFlow?{" "}
        <Link href={next ? `/create-account?next=${encodeURIComponent(next)}` : "/create-account"}>Create an account</Link>
      </p>
      <p className="mt-2 text-[12px] text-neutral-600">
        Staff accounts are created by a super admin and arrive by email — there is no separate admin sign-up.
      </p>
    </>
  );
}
