"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/data/api-client";
import type { CreateStaff, UserRole } from "@/core/models/user";

/**
 * The staff routes, as hooks. These are the one part of the admin side that
 * does not go through a repository: staff accounts need Auth-side data (last
 * sign-in, whether an invite was used) that only the server can read.
 */

export interface StaffRow {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  designation: string | null;
  festIds: string[];
  disabled: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  activated: boolean;
}

export interface InviteResult {
  emailed: boolean;
  provider: string;
  setPasswordLink?: string;
}

export const useStaff = () =>
  useQuery({
    queryKey: ["staff"],
    queryFn: () => api<{ staff: StaffRow[] }>("/api/admin/staff").then((r) => r.staff),
    staleTime: 20_000,
  });

export const useCreateStaff = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaff) =>
      api<{ user: StaffRow; invite: InviteResult }>("/api/admin/staff", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["staff"] }),
  });
};

export const useUpdateStaff = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; fullName?: string; designation?: string; role?: "organizer" | "admin" | "super_admin"; festIds?: string[]; disabled?: boolean }) =>
      api<{ id: string }>(`/api/admin/staff/${id}`, { method: "PATCH", body: changes }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["staff"] }),
  });
};

export const useDeleteStaff = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ id: string }>(`/api/admin/staff/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["staff"] }),
  });
};

export const useResendInvite = () =>
  useMutation({
    mutationFn: (id: string) => api<InviteResult>(`/api/admin/staff/${id}/invite`, { method: "POST" }),
  });
