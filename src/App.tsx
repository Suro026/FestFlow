import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import StudentLogin from "./pages/StudentLogin";
import StudentDashboard from "./pages/StudentDashboard";
import MyEvents from "./pages/MyEvents";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AttendanceScanner from "./pages/AttendanceScanner";
import EventManagement from "./pages/EventManagement";
import StudentRegister from "./pages/StudentRegister.tsx";
import AdminRegister from "./pages/AdminRegister.tsx";
import MyCertificates from "./pages/MyCertificates";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import CreateAdmin from "./pages/CreateAdmin";
import ManageAdmins from "./pages/ManageAdmins";
import FestRegistration from "./pages/FestRegistration";
import Fests from "./pages/Fests";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route index element={<Index />} />
          <Route path="/student-login" element={<StudentLogin />} />
          <Route path="/student-register" element={<StudentRegister />} />

          {/* Student Routes */}
          <Route
            path="/student-dashboard"
            element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>}
          />
          <Route
            path="/my-events"
            element={<RequireAuth role="student"><MyEvents /></RequireAuth>}
          />
          <Route
            path="/my-certificates"
            element={<RequireAuth role="student"><MyCertificates /></RequireAuth>}
          />
          <Route
            path="/fests"
            element={<RequireAuth role="student"><Fests /></RequireAuth>}
          />

          <Route path="/admin-register" element={<AdminRegister />} />

          {/* Super Admin Routes */}
          <Route
            path="/super-admin-dashboard"
            element={<RequireAuth role="superAdmin"><SuperAdminDashboard /></RequireAuth>}
          />
          <Route
            path="/create-admin"
            element={<RequireAuth role="superAdmin"><CreateAdmin /></RequireAuth>}
          />
          <Route
            path="/manage-admins"
            element={<RequireAuth role="superAdmin"><ManageAdmins /></RequireAuth>}
          />

          {/* Reached straight after organizer sign-up, so it only requires a
              signed-in organizer rather than an existing super admin. */}
          <Route
            path="/fest-registration"
            element={<RequireAuth role="organizer"><FestRegistration /></RequireAuth>}
          />

          {/* Admin Routes */}
           <Route path="/admin-login" element={<AdminLogin />} />
            {/* <Route path="/admin-register" element={<AdminRegister />} /> */}
            <Route
              path="/admin-dashboard"
              element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>}
            />
            <Route
              path="/attendance-scanner"
              element={<RequireAuth role="admin"><AttendanceScanner /></RequireAuth>}
            />
            <Route
              path="/event-management"
              element={<RequireAuth role="admin"><EventManagement /></RequireAuth>}
            />

          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
