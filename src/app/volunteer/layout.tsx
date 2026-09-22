import * as React from "react";
import type { Metadata } from "next";
import { GuardSkeleton, RequireRole } from "@/components/shell/require-role";

/** Volunteers hold organizer accounts; anyone at organizer or above may open this side. */
export const metadata: Metadata = {
  title: "Volunteer",
  description: "Your shifts and the scanner.",
  robots: { index: false, follow: false },
};

export default function VolunteerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole minimum="organizer" fallback="/explore">
      <React.Suspense fallback={<GuardSkeleton />}>{children}</React.Suspense>
    </RequireRole>
  );
}
