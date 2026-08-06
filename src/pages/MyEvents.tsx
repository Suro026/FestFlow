import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, LogOut, History, Calendar, MapPin, Clock, Ticket, Download } from 'lucide-react';
import { Event, Registration } from '@/types/events';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

const MyEvents = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const storedStudentId = sessionStorage.getItem('studentId');

if (!isLoggedIn || !storedStudentId) {
  navigate('/student-login');
  return;
}

setStudentId(storedStudentId);
    setStudentId(storedStudentId);

    // Load registrations from localStorage
    const stored = localStorage.getItem(`registrations_${storedStudentId}`);
    if (stored) {
      setRegistrations(JSON.parse(stored));
    }
  }, [navigate]);
  useEffect(() => {
  const loadData = async () => {
    try {
      const student = sessionStorage.getItem("studentId");
      if (!student) return;

      // registrations
      const regQuery = query(
        collection(db, "eventRegistrations"),
        where("studentId", "==", student)
      );

      const regSnapshot = await getDocs(regQuery);

      const regs: any[] = regSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setRegistrations(regs);

      // events
      const eventSnapshot = await getDocs(
        collection(db, "events")
      );

      const eventsData: Event[] = eventSnapshot.docs.map(doc => {
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

  loadData();
}, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('studentId');
    toast.success('Logged out successfully');
    navigate('/student-login');
  };

  const handleDownloadTicket = (registration: Registration) => {
    const event = events.find(e => e.id === registration.eventId);
    if (!event) return;

    const qrElement = document.getElementById(`qr-${registration.ticketCode}`);
    if (!qrElement) return;

    const svgData = new XMLSerializer().serializeToString(qrElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `ticket-${registration.ticketCode}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      
      toast.success('Ticket downloaded!');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">My Registrations</h1>
                <p className="text-sm text-primary-foreground/80">Student {studentId}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/student-dashboard')} 
                variant="secondary"
                size="sm"
              >
                Back to Events
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="secondary"
                size="sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}

<div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-700 px-10 py-16 text-white shadow-2xl mb-10">

  <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

  <div className="absolute -left-20 -bottom-20 h-72 w-72 rounded-full bg-pink-300/10 blur-3xl" />

  <div className="relative">

    <span className="rounded-full bg-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.25em]">
      Student Portal
    </span>

    <h1 className="mt-6 text-5xl font-black">
      Registration History
    </h1>

    <p className="mt-4 max-w-2xl text-lg text-white/90">
      Keep track of your registered events and download tickets anytime.
    </p>

    <div className="mt-8 flex flex-wrap gap-4">

      <div className="rounded-2xl bg-white/15 px-6 py-5 backdrop-blur">

        <p className="text-sm text-white/80">
          Total Registrations
        </p>

        <h2 className="text-4xl font-bold">
          {registrations.length}
        </h2>

      </div>

      <div className="rounded-2xl bg-white/15 px-6 py-5 backdrop-blur">

        <p className="text-sm text-white/80">
          Upcoming
        </p>

        <h2 className="text-4xl font-bold">
          {registrations.filter((r:any)=>!r.attendance).length}
        </h2>

      </div>

    </div>

  </div>

</div>

        {/* Registrations List */}
        <main className="max-w-7xl mx-auto px-4 pb-20">
          {registrations.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Ticket className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Registrations Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start exploring events and register to see your tickets here
                </p>
                <Button onClick={() => navigate('/student-dashboard')}>
                  Browse Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-[1fr_300px] gap-6">
              <div className="grid gap-6">
                {registrations.map((registration) => {
                  const event = events.find(e => e.id === registration.eventId);
                  if (!event) return null;

                  const qrData = JSON.stringify({
                    eventId: event.id,
                    studentId: registration.studentId,
                    ticketCode: registration.ticketCode,
                    eventTitle: event.title,
                  });

                  return (
                    <div
                      key={registration.ticketCode}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
                    >
                      <div className="grid lg:grid-cols-[1fr_250px]">
                        <div className="p-8">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                Registration Confirmed
                              </span>
                              <h2 className="mt-4 text-3xl font-black">{event.title}</h2>
                            </div>
                          </div>

                          <div className="mt-8 grid gap-4 md:grid-cols-3">
                            <div>
                              <p className="text-xs uppercase text-slate-500">Date</p>
                              <p className="mt-1 font-semibold">{event.date}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-slate-500">Time</p>
                              <p className="mt-1 font-semibold">{event.time}</p>
                            </div>
                            <div>
                              <p className="text-xs uppercase text-slate-500">Venue</p>
                              <p className="mt-1 font-semibold">{event.location}</p>
                            </div>
                          </div>

                          <div className="mt-8">
                            <p className="text-xs uppercase text-slate-500">Ticket Code</p>
                            <p className="mt-2 text-2xl font-bold text-indigo-700">{registration.ticketCode}</p>
                          </div>

                          <Button onClick={() => handleDownloadTicket(registration)} className="mt-8">
                            <Download className="mr-2 h-4 w-4" />
                            Download Ticket
                          </Button>
                        </div>

                        <div className="flex flex-col items-center justify-center border-l bg-slate-50 p-8">
                          <QRCode id={`qr-${registration.ticketCode}`} value={qrData} size={170} />
                          <p className="mt-5 text-sm font-medium text-slate-500">Scan for Entry</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <aside className="rounded-3xl border bg-white p-6 shadow-lg h-fit sticky top-24">
                <h2 className="text-xl font-bold">Filters</h2>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">Search</label>
                  <input type="text" placeholder="Search event..." className="w-full rounded-xl border p-3" />
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">Status</label>
                  <select className="w-full rounded-xl border p-3">
                    <option>All</option>
                    <option>Upcoming</option>
                    <option>Completed</option>
                  </select>
                </div>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">Sort By</label>
                  <select className="w-full rounded-xl border p-3">
                    <option>Newest</option>
                    <option>Oldest</option>
                    <option>Event Date</option>
                  </select>
                </div>
              </aside>
            </div>
          )}
        </main>
    </div>
  );
};

export default MyEvents;
