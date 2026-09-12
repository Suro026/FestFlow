import * as React from "react";
import { GuardSkeleton, RequireRole } from "@/components/shell/require-role";
import { StudentShell } from "@/components/shell/student-shell";

/**
 * Signed-in student pages: My pass, My events, Certificates, Teams, Profile,
 * and the registration success screen. Any signed-in account may use them —
 * staff hold tickets too.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole minimum="student">
      <StudentShell>
        <React.Suspense fallback={<GuardSkeleton />}>{children}</React.Suspense>
      </StudentShell>
    </RequireRole>
  );
}
