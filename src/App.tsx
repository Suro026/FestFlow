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
          <Route path="/student-dashboard" element={<StudentDashboard />} />
          <Route path="/my-events" element={<MyEvents />} />
          <Route path="/my-certificates" element={<MyCertificates />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
          <Route path="/create-admin" element={<CreateAdmin />}/>
          <Route path="/manage-admins" element={<ManageAdmins />} />
          <Route path="/fest-registration" element={<FestRegistration />} />
          <Route path="/fests" element={<Fests />} />
 
          
          {/* Admin Routes */}
           <Route path="/admin-login" element={<AdminLogin />} />
            {/* <Route path="/admin-register" element={<AdminRegister />} /> */}
            <Route path="/admin-dashboard" element={<AdminDashboard />} />
            <Route path="/attendance-scanner" element={<AttendanceScanner />} />
            <Route path="/event-management" element={<EventManagement />} />

          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
