import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export const SUPER_ADMIN_EMAIL = "superadmin@festflow.com";

export type RequiredRole = "student" | "organizer" | "admin" | "superAdmin";

interface RequireAuthProps {
  role: RequiredRole;
  children: JSX.Element;
}

const LOGIN_ROUTE: Record<RequiredRole, string> = {
  student: "/student-login",
  organizer: "/admin-login",
  admin: "/admin-login",
  superAdmin: "/admin-login",
};

/**
 * Route guard.
 *
 * Access used to be decided by `sessionStorage` flags such as
 * `isAdminLoggedIn`, which anyone could set from the browser console, and
 * several admin routes had no check at all. This resolves the real Firebase
 * session and re-reads the caller's own profile document from Firestore on
 * every mount, so the decision is based on server-held data rather than a
 * client-writable string.
 *
 * Note this is still a client-side control: it stops URL tampering and hides
 * admin surfaces, but it is not a substitute for Firestore security rules,
 * which are what actually protect the data.
 */
const RequireAuth = ({ role, children }: RequireAuthProps) => {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking"
  );

  useEffect(() => {
    let cancelled = false;

    const resolve = async (user: User | null) => {
      if (!user) return false;

      if (role === "student") {
        const snap = await getDoc(doc(db, "students", user.uid));
        if (!snap.exists()) return false;

        // Keep the identifiers the existing pages read in sync, now that they
        // are derived from a verified session rather than set at login only.
        sessionStorage.setItem("studentUid", user.uid);
        sessionStorage.setItem("studentEmail", user.email ?? "");
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem(
          "studentId",
          snap.data()?.studentId || user.uid
        );

        return true;
      }

      // The bootstrap super admin is identified by address and may not have an
      // `organizers` document, which matches how AdminLogin has always
      // treated it.
      const isBootstrapSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

      if (role === "superAdmin" && isBootstrapSuperAdmin) {
        sessionStorage.setItem("isSuperAdmin", "true");
        sessionStorage.setItem("adminId", user.email ?? "");
        return true;
      }

      const snap = await getDoc(doc(db, "organizers", user.uid));
      if (!snap.exists()) return false;

      if (role === "superAdmin" && snap.data()?.role !== "super_admin") {
        return false;
      }

      sessionStorage.setItem("isAdminLoggedIn", "true");
      sessionStorage.setItem("adminId", user.email ?? "");

      return true;
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      resolve(user)
        .then((allowed) => {
          if (!cancelled) setStatus(allowed ? "allowed" : "denied");
        })
        .catch((error) => {
          // Fail closed: a rules rejection or a network error must not be
          // read as authorisation.
          console.error("Access check failed:", error);
          if (!cancelled) setStatus("denied");
        });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [role]);

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9f9ff]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-pink-600 border-t-transparent" />
      </div>
    );
  }

  if (status === "denied") {
    return <Navigate to={LOGIN_ROUTE[role]} state={{ from: location }} replace />;
  }

  return children;
};

export default RequireAuth;
