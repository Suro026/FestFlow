"use client";

import * as React from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { CreateFest, Fest, UpdateFest } from "@/core/models/fest";
import { calendarDateSchema, emailSchema, shortTextSchema } from "@/core/models/common";
import { Field, Input, Textarea } from "@/components/ui/field";
import { slugify } from "@/lib/utils";

/**
 * The fest form, shared by creation and settings. Slug follows the name
 * until edited; it is locked after publishing because it is the fest's URL.
 */
export const festFormSchema = z
  .object({
    name: shortTextSchema,
    slug: z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase letters, numbers and hyphens"),
    tagline: z.string().trim().max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    organizationName: shortTextSchema,
    venue: shortTextSchema,
    city: shortTextSchema,
    startDate: calendarDateSchema,
    endDate: calendarDateSchema,
    bannerUrl: z.union([z.string().url("Enter a full URL"), z.literal("")]).optional(),
    logoUrl: z.union([z.string().url("Enter a full URL"), z.literal("")]).optional(),
    contactEmail: z.union([emailSchema, z.literal("")]).optional(),
    contactPhone: z.string().trim().max(20).optional(),
  })
  .refine((f) => f.endDate >= f.startDate, { message: "Ends before it starts", path: ["endDate"] });

export type FestFormValues = z.input<typeof festFormSchema>;
export type FestFormOutput = z.output<typeof festFormSchema>;

const blank = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export const toCreateFest = (v: FestFormOutput): CreateFest => ({
  name: v.name,
  slug: v.slug,
  tagline: blank(v.tagline),
  description: blank(v.description),
  organizationName: v.organizationName,
  venue: v.venue,
  city: v.city,
  startDate: v.startDate,
  endDate: v.endDate,
  bannerUrl: blank(v.bannerUrl),
  logoUrl: blank(v.logoUrl),
  contactEmail: blank(v.contactEmail),
  contactPhone: blank(v.contactPhone),
});

export const toUpdateFest = (v: FestFormOutput): UpdateFest => {
  const { slug: _slug, ...rest } = toCreateFest(v);
  void _slug;
  return rest;
};

export const fromFest = (f: Fest): FestFormValues => ({
  name: f.name,
  slug: f.slug,
  tagline: f.tagline ?? "",
  description: f.description ?? "",
  organizationName: f.organizationName,
  venue: f.venue,
  city: f.city,
  startDate: f.startDate,
  endDate: f.endDate,
  bannerUrl: f.bannerUrl ?? "",
  logoUrl: f.logoUrl ?? "",
  contactEmail: f.contactEmail ?? "",
  contactPhone: f.contactPhone ?? "",
});

export const emptyFest = (): FestFormValues => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  const start = d.toISOString().slice(0, 10);
  return { name: "", slug: "", tagline: "", description: "", organizationName: "", venue: "", city: "", startDate: start, endDate: start, bannerUrl: "", logoUrl: "", contactEmail: "", contactPhone: "" };
};

export const useFestForm = (defaults: FestFormValues) =>
  useForm<FestFormValues, unknown, FestFormOutput>({ resolver: zodResolver(festFormSchema), defaultValues: defaults, mode: "onBlur" });

type Form = UseFormReturn<FestFormValues, unknown, FestFormOutput>;

export const FestFields = ({ form, lockSlug }: { form: Form; lockSlug?: boolean }) => {
  const err = form.formState.errors;
  const name = form.watch("name");
  const touched = React.useRef(false);

  React.useEffect(() => {
    if (!touched.current && !lockSlug) form.setValue("slug", slugify(name ?? ""));
  }, [name, form, lockSlug]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Fest name" htmlFor="f-name" error={err.name?.message}>
        <Input id="f-name" placeholder="Ignitia ’26" {...form.register("name")} />
      </Field>
      <Field label="Address" htmlFor="f-slug" error={err.slug?.message} hint={lockSlug ? "Locked once published — it is the fest's URL." : "festflow.app/f/…"}>
        <Input id="f-slug" disabled={lockSlug} className="font-mono text-[13px]" {...form.register("slug", { onChange: () => (touched.current = true) })} />
      </Field>
      <Field label="Tagline" htmlFor="f-tag" error={err.tagline?.message} className="sm:col-span-2">
        <Input id="f-tag" placeholder="Three days, 42 events, one pass." {...form.register("tagline")} />
      </Field>
      <Field label="Description" htmlFor="f-desc" error={err.description?.message} className="sm:col-span-2">
        <Textarea id="f-desc" rows={3} {...form.register("description")} />
      </Field>
      <Field label="Organising institution" htmlFor="f-org" error={err.organizationName?.message}>
        <Input id="f-org" placeholder="SRM Institute of Science & Technology" {...form.register("organizationName")} />
      </Field>
      <Field label="City" htmlFor="f-city" error={err.city?.message}>
        <Input id="f-city" placeholder="Chennai" {...form.register("city")} />
      </Field>
      <Field label="Venue" htmlFor="f-venue" error={err.venue?.message} className="sm:col-span-2">
        <Input id="f-venue" placeholder="Kattankulathur campus" {...form.register("venue")} />
      </Field>
      <Field label="Starts" htmlFor="f-start" error={err.startDate?.message}>
        <Input id="f-start" type="date" {...form.register("startDate")} />
      </Field>
      <Field label="Ends" htmlFor="f-end" error={err.endDate?.message}>
        <Input id="f-end" type="date" {...form.register("endDate")} />
      </Field>
      <Field label="Cover image URL" htmlFor="f-banner" error={err.bannerUrl?.message} hint="1080×1350 for the marquee.">
        <Input id="f-banner" type="url" placeholder="https://…" {...form.register("bannerUrl")} />
      </Field>
      <Field label="Logo URL" htmlFor="f-logo" error={err.logoUrl?.message}>
        <Input id="f-logo" type="url" placeholder="https://…" {...form.register("logoUrl")} />
      </Field>
      <Field label="Contact email" htmlFor="f-email" error={err.contactEmail?.message}>
        <Input id="f-email" type="email" placeholder="fest@college.edu" {...form.register("contactEmail")} />
      </Field>
      <Field label="Contact phone" htmlFor="f-phone" error={err.contactPhone?.message}>
        <Input id="f-phone" type="tel" placeholder="+91" {...form.register("contactPhone")} />
      </Field>
    </div>
  );
};
