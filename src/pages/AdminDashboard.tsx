import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, QrCode, Calendar, Users, TrendingUp } from 'lucide-react';
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Event } from "@/types/events";
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const storedAdminId = sessionStorage.getItem('adminId');
    
    if (!isLoggedIn || !storedAdminId) {
      navigate('/admin-login');
      return;
    }
    
    setAdminId(storedAdminId);
    const loadEvents = async () => {
  try {
    const snapshot = await getDocs(collection(db, "events"));
    const loadRegistrations = async () => {
  try {
    const snapshot = await getDocs(
      collection(db, "eventRegistrations")
    );

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setAllRegistrations(data);
    setTotalRegistrations(data.length);
  } catch (error) {
    console.error(error);
  }
};

loadRegistrations();

    const eventsData: Event[] = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: data.title || "",
        description: data.description || "",
        date: data.date || "",
        time: data.time || "",
        location: data.venue || "",
        category: "Event",
        capacity: Number(data.capacity) || 0,
        registered: 0,
        status: "Upcoming",
        imageUrl: data.imageUrl || "",
        eventType: data.eventType || "team",
        teamSize: data.teamSize || 1,
        registrationOpen: data.registrationOpen ?? true,
      };
    });

    setEvents(eventsData);
  } catch (error) {
    console.error(error);
  }
};

loadEvents();

}, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };
  const totalCapacity = events.reduce(
    (sum, e) => sum + e.capacity,
    0
  );

  const totalAttendance = allRegistrations.filter(
    (r) => r.attendance === true
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex min-h-screen bg-slate-50">

  {/* Sidebar */}

  <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r bg-white p-6 shadow-sm">

    <div>

      <h1 className="text-3xl font-black bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
        FestFlow
      </h1>

      <p className="mt-1 text-sm text-slate-500">
        University Admin
      </p>

    </div>

    <nav className="mt-10 space-y-2">

      <Button
        variant="ghost"
        className="w-full justify-start"
      >
        Dashboard
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate("/event-management")}
      >
        Events
      </Button>

      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate("/attendance-scanner")}
      >
        Attendance
      </Button>

    </nav>

    <Button
      onClick={handleLogout}
      className="mt-auto"
      variant="destructive"
    >
      Logout
    </Button>

  </aside>

  {/* Main */}

  <div className="ml-64 flex-1">

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-8 py-8">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-indigo-600 to-purple-700 p-10 text-white shadow-2xl">

  <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

  <div className="relative z-10">

    <h1 className="text-4xl font-black">
      Event Management Dashboard
    </h1>

    <p className="mt-3 max-w-3xl text-lg text-white/90">
      Manage registrations, attendance, food collection, certificates and campus
      events from one centralized dashboard.
    </p>

    <div className="mt-10 grid gap-5 md:grid-cols-3">

  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">

    <p className="text-sm uppercase tracking-wider text-white/70">
      Active Events
    </p>

    <h2 className="mt-3 text-4xl font-black">
      {events.length}
    </h2>

    <p className="mt-2 text-sm text-white/80">
      Currently published events
    </p>

  </div>

  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">

    <p className="text-sm uppercase tracking-wider text-white/70">
      Registrations
    </p>

    <h2 className="mt-3 text-4xl font-black">
      {totalRegistrations}
    </h2>

    <p className="mt-2 text-sm text-white/80">
      Student registrations received
    </p>

  </div>

  <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-xl">

    <p className="text-sm uppercase tracking-wider text-white/70">
      Attendance
    </p>

    <h2 className="mt-3 text-4xl font-black">
      {totalAttendance}
    </h2>

    <p className="mt-2 text-sm text-white/80">
      Students checked in
    </p>

  </div>

</div>

  </div>

</section>

        {/* Quick Actions */}

<div className="mt-10 grid gap-6 lg:grid-cols-2">

  {/* Attendance */}

  <div
    onClick={() => navigate("/attendance-scanner")}
    className="group cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white shadow-xl transition hover:-translate-y-2"
  >

    <QrCode className="h-12 w-12" />

    <h2 className="mt-6 text-3xl font-black">
      Attendance Scanner
    </h2>

    <p className="mt-3 text-white/80">
      Scan QR codes, verify registrations and mark attendance instantly.
    </p>

    <Button
      className="mt-8 bg-white text-indigo-700 hover:bg-white"
    >
      Open Scanner
    </Button>

  </div>

  {/* Event Management */}

  <div
    onClick={() => navigate("/event-management")}
    className="group cursor-pointer overflow-hidden rounded-3xl border bg-white p-8 shadow-xl transition hover:-translate-y-2"
  >

    <Calendar className="h-12 w-12 text-pink-600" />

    <h2 className="mt-6 text-3xl font-black">
      Event Management
    </h2>

    <p className="mt-3 text-slate-600">
      Create, edit and publish events, control registrations and manage capacities.
    </p>

    <Button
      className="mt-8"
    >
      Manage Events
    </Button>

            </div>

            </div>
          {/* Registration Trends */}

<div className="mt-10 rounded-3xl border bg-white p-8 shadow-sm">

  <div className="mb-6 flex items-center justify-between">

    <div>

      <h2 className="text-2xl font-bold">
        Registration Trends
      </h2>

      <p className="text-slate-500">
        Daily registrations across all events
      </p>

    </div>

  </div>

  <div className="h-80 rounded-2xl border bg-slate-50 flex items-center justify-center">

    {/* Recharts goes here */}

  </div>

</div>
{/* Events Overview */}

<div className="mt-10 rounded-3xl border bg-white shadow-sm">

  <div className="border-b p-8">

    <h2 className="text-2xl font-bold">
      Events Overview
    </h2>

    <p className="mt-2 text-slate-500">
      Manage registrations and monitor event performance.
    </p>

  </div>

  <div className="overflow-x-auto">

    <table className="w-full">

      <thead className="bg-slate-50">

        <tr>

          <th className="px-8 py-4 text-left">Event</th>

          <th className="px-8 py-4 text-left">Date</th>

          <th className="px-8 py-4 text-left">Venue</th>

          <th className="px-8 py-4 text-center">Capacity</th>

          <th className="px-8 py-4 text-center">Registered</th>

          <th className="px-8 py-4 text-center">Status</th>

          <th className="px-8 py-4 text-right">Action</th>

        </tr>

      </thead>

      <tbody>

        {events.map((event) => {

          const registrationCount = allRegistrations.filter(
            (r) => r.eventId === event.id
          ).length;

          return (

            <tr
              key={event.id}
              className="border-t hover:bg-slate-50"
            >

              <td className="px-8 py-6">

                <div>

                  <h3 className="font-bold">
                    {event.title}
                  </h3>

                  <p className="text-sm text-slate-500">
                    {event.category}
                  </p>

                </div>

              </td>

              <td className="px-8">

                {new Date(event.date).toLocaleDateString()}

              </td>

              <td className="px-8">

                {event.location}

              </td>

              <td className="px-8 text-center">

                {event.capacity}

              </td>

              <td className="px-8 text-center font-semibold">

                {registrationCount}

              </td>

              <td className="px-8 text-center">

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">

                  {event.status}

                </span>

              </td>

              <td className="px-8 text-right">

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(`/event/${event.id}`)
                  }
                >
                  View
                </Button>

              </td>

            </tr>

          );

        })}

      </tbody>

    </table>

  </div>

</div>
      </main>
      </div>
    </div>
    </div>
    );
};

export default AdminDashboard;