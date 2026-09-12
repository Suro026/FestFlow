import * as React from "react";
import { GuardSkeleton, RequireRole } from "@/components/shell/require-role";

/** Volunteers hold organizer accounts; anyone at organizer or above may open this side. */
export default function VolunteerRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole minimum="organizer" fallback="/explore">
      <React.Suspense fallback={<GuardSkeleton />}>{children}</React.Suspense>
    </RequireRole>
  );
}
