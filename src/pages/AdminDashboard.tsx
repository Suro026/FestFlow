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
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-x-0 top-0 z-30 border-b border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm lg:inset-y-0 lg:left-0 lg:w-64 lg:border-b-0 lg:border-r lg:p-6">
        <div className="flex flex-col gap-4 lg:h-full lg:justify-between">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent sm:text-3xl">
                  FestFlow
                </h1>
                <p className="mt-1 text-sm text-slate-500">University Admin</p>
              </div>
            </div>

            <nav className="mt-4 flex flex-wrap gap-2 lg:mt-10 lg:flex-col">
              <Button variant="ghost" className="w-full justify-start">
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
          </div>

          <Button
            onClick={handleLogout}
            className="mt-2 w-full lg:mt-auto"
            variant="destructive"
          >
            Logout
          </Button>
        </div>
      </aside>

      <div className="lg:ml-64">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-indigo-600 to-purple-700 p-6 text-white shadow-2xl sm:p-8 lg:p-10">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl sm:h-72 sm:w-72" />

            <div className="relative z-10">
              <h1 className="text-2xl font-black sm:text-3xl lg:text-4xl">
                Event Management Dashboard
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-white/90 sm:text-base lg:text-lg">
                Manage registrations, attendance, food collection, certificates and campus
                events from one centralized dashboard.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl sm:p-6">
                  <p className="text-xs uppercase tracking-wider text-white/70 sm:text-sm">
                    Active Events
                  </p>
                  <h2 className="mt-3 text-3xl font-black sm:text-4xl">{events.length}</h2>
                  <p className="mt-2 text-xs text-white/80 sm:text-sm">
                    Currently published events
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl sm:p-6">
                  <p className="text-xs uppercase tracking-wider text-white/70 sm:text-sm">
                    Registrations
                  </p>
                  <h2 className="mt-3 text-3xl font-black sm:text-4xl">{totalRegistrations}</h2>
                  <p className="mt-2 text-xs text-white/80 sm:text-sm">
                    Student registrations received
                  </p>
                </div>

                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xl sm:p-6">
                  <p className="text-xs uppercase tracking-wider text-white/70 sm:text-sm">
                    Attendance
                  </p>
                  <h2 className="mt-3 text-3xl font-black sm:text-4xl">{totalAttendance}</h2>
                  <p className="mt-2 text-xs text-white/80 sm:text-sm">
                    Students checked in
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-10 grid gap-6 xl:grid-cols-2">
            <div
              onClick={() => navigate("/attendance-scanner")}
              className="group cursor-pointer overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-xl transition hover:-translate-y-1 sm:p-8"
            >
              <QrCode className="h-10 w-10 sm:h-12 sm:w-12" />

              <h2 className="mt-6 text-2xl font-black sm:text-3xl">Attendance Scanner</h2>

              <p className="mt-3 text-sm text-white/80 sm:text-base">
                Scan QR codes, verify registrations and mark attendance instantly.
              </p>

              <Button className="mt-8 bg-white text-indigo-700 hover:bg-white">
                Open Scanner
              </Button>
            </div>

            <div
              onClick={() => navigate("/event-management")}
              className="group cursor-pointer overflow-hidden rounded-3xl border bg-white p-6 shadow-xl transition hover:-translate-y-1 sm:p-8"
            >
              <Calendar className="h-10 w-10 text-pink-600 sm:h-12 sm:w-12" />

              <h2 className="mt-6 text-2xl font-black sm:text-3xl">Event Management</h2>

              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                Create, edit and publish events, control registrations and manage capacities.
              </p>

              <Button className="mt-8">Manage Events</Button>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border bg-white p-4 shadow-sm sm:p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">Registration Trends</h2>
                <p className="text-sm text-slate-500">Daily registrations across all events</p>
              </div>
            </div>

            <div className="flex h-64 items-center justify-center rounded-2xl border bg-slate-50 sm:h-80">
              {/* Recharts goes here */}
            </div>
          </div>

          <div className="mt-10 rounded-3xl border bg-white shadow-sm">
            <div className="border-b p-4 sm:p-6 lg:p-8">
              <h2 className="text-xl font-bold sm:text-2xl">Events Overview</h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Manage registrations and monitor event performance.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm sm:px-6 lg:px-8">Event</th>
                    <th className="px-4 py-4 text-left text-sm sm:px-6 lg:px-8">Date</th>
                    <th className="px-4 py-4 text-left text-sm sm:px-6 lg:px-8">Venue</th>
                    <th className="px-4 py-4 text-center text-sm sm:px-6 lg:px-8">Capacity</th>
                    <th className="px-4 py-4 text-center text-sm sm:px-6 lg:px-8">Registered</th>
                    <th className="px-4 py-4 text-center text-sm sm:px-6 lg:px-8">Status</th>
                    <th className="px-4 py-4 text-right text-sm sm:px-6 lg:px-8">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((event) => {
                    const registrationCount = allRegistrations.filter(
                      (r) => r.eventId === event.id
                    ).length;

                    return (
                      <tr key={event.id} className="border-t hover:bg-slate-50">
                        <td className="px-4 py-5 sm:px-6 lg:px-8">
                          <div>
                            <h3 className="font-bold text-sm sm:text-base">{event.title}</h3>
                            <p className="text-xs text-slate-500 sm:text-sm">{event.category}</p>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm sm:px-6 lg:px-8">
                          {new Date(event.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-5 text-sm sm:px-6 lg:px-8">{event.location}</td>
                        <td className="px-4 py-5 text-center text-sm sm:px-6 lg:px-8">{event.capacity}</td>
                        <td className="px-4 py-5 text-center text-sm font-semibold sm:px-6 lg:px-8">
                          {registrationCount}
                        </td>
                        <td className="px-4 py-5 text-center sm:px-6 lg:px-8">
                          <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700 sm:text-xs">
                            {event.status}
                          </span>
                        </td>
                        <td className="px-4 py-5 text-right sm:px-6 lg:px-8">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/event/${event.id}`)}
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
  );
};

export default AdminDashboard;