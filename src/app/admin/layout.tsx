import * as React from "react";
import { GuardSkeleton, RequireRole } from "@/components/shell/require-role";

/**
 * Everything under /admin needs at least an organizer account. Which fests
 * an account may open is decided one level down, by the fest-scoped layout.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireRole minimum="organizer" fallback="/explore">
      <React.Suspense fallback={<GuardSkeleton />}>{children}</React.Suspense>
    </RequireRole>
  );
}
