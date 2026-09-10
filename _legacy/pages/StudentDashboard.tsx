import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  History,
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import DigitalTicket from '@/components/DigitalTicket';
import RegistrationForm from '@/components/RegistrationForm';
import { Event, Registration } from '@/types/events';
import { toast } from 'sonner';
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  getCountFromServer,
  query,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketCode, setTicketCode] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
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

    const loadEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, "events"));

        const eventsData: Event[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            date: data.date || "",
            time: data.time || "",
            location: data.venue || "",
            category: data.category || "Event",
            capacity: Number(data.capacity) || 0,
            registered: 0,
            status: "Upcoming",
            imageUrl: data.imageUrl || "/default.jpg",

            eventType: data.eventType || "solo",
            teamSize: data.teamSize || 1,
            registrationOpen: data.registrationOpen ?? true,
          };
        });

        const openEvents = eventsData.filter(
          (event) => event.registrationOpen === true
        );

        // `registered` used to be hard-coded to 0, so the "event is full"
        // check could never fire. A server-side count keeps capacity accurate
        // without pulling every registration (and the personal data in them)
        // down to the student's browser.
        const withCounts = await Promise.all(
          openEvents.map(async (event) => {
            try {
              const countSnapshot = await getCountFromServer(
                query(
                  collection(db, "eventRegistrations"),
                  where("eventId", "==", event.id)
                )
              );

              return { ...event, registered: countSnapshot.data().count };
            } catch (error) {
              console.error(`Count failed for event ${event.id}:`, error);
              return event;
            }
          })
        );

        setEvents(withCounts);
      } catch (error) {
        console.error("Error loading events:", error);
      }
    };

    // Existing registrations come from Firestore. They were previously read
    // from a `registrations_*` localStorage key that nothing ever wrote, so
    // after any page refresh the duplicate-registration check saw an empty
    // list and the same student could register for one event repeatedly.
    const loadRegistrations = async () => {
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "eventRegistrations"),
            where("studentId", "==", storedStudentId)
          )
        );

        setRegistrations(
          snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
              eventId: data.eventId,
              studentId: data.studentId,
              ticketCode: data.ticketCode,
              registeredAt:
                data.registeredAt?.toDate?.().toISOString() ??
                new Date().toISOString(),
            } as Registration;
          })
        );
      } catch (error) {
        console.error("Error loading registrations:", error);
      }
    };

    loadEvents();
    loadRegistrations();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('studentId');
    toast.success('Logged out successfully');
    navigate('/student-login');
  };

  // A ticket code is the only credential the attendance scanner checks, so it
  // must not be guessable. The previous version leaked the registration time
  // (Date.now()) and left only ~46k random combinations from Math.random(),
  // which is not a cryptographic PRNG. This uses the platform CSPRNG over a
  // 32-character alphabet (256 / 32 divides evenly, so no modulo bias).
  const generateTicketCode = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(10);

    crypto.getRandomValues(bytes);

    let code = "";
    for (const byte of bytes) {
      code += alphabet[byte % alphabet.length];
    }

    return `B2B-${code}`;
  };

  const handleRegister = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // An event with no capacity recorded means "unlimited", not "full" - the
    // unguarded comparison rejected every registration when capacity was 0.
    if (event.capacity > 0 && event.registered >= event.capacity) {
      toast.error('Sorry, this event is full');
      return;
    }

    // Check if already registered
    const alreadyRegistered = registrations.some(r => r.eventId === eventId);
    if (alreadyRegistered) {
      toast.error('You are already registered for this event');
      return;
    }

    setSelectedEvent(event);
    setShowRegistrationForm(true);
  };

  const handleRegistrationSubmit = async(data: { teamName: string; members: any[] }) => {
    if (!selectedEvent) return;

    const newTicketCode = generateTicketCode();
    
    const newRegistration: Registration = {
      eventId: selectedEvent.id,
      studentId,
      ticketCode: newTicketCode,
      registeredAt: new Date().toISOString(),
    };

    // Save registration
    try {
  await addDoc(collection(db, "eventRegistrations"), {
    eventId: selectedEvent.id,
    eventTitle: selectedEvent.title,
    studentId,
    ticketCode: newTicketCode,
    teamName: data.teamName,
    members: data.members.map((member) => ({
  ...member,
  foodCollected: false,
})),
    attendance: false,
    registeredAt: serverTimestamp(),
  });

  setRegistrations([...registrations, newRegistration]);

  // Keep the displayed seat count in step with the write that just happened,
  // so capacity is enforced without waiting for a reload.
  setEvents((previous) =>
    previous.map((event) =>
      event.id === selectedEvent.id
        ? { ...event, registered: event.registered + 1 }
        : event
    )
  );

  // Close form and show ticket
  setShowRegistrationForm(false);
  setTicketCode(newTicketCode);
  setShowTicket(true);

  toast.success(`Successfully registered for ${selectedEvent.title}!`, {
    description: `Team: ${data.teamName} | ${data.members.length} member(s)`,
  });

} catch (error) {
  console.error(error);
  toast.error("Failed to register for event");
}
  };

  return (
  <div className="min-h-screen bg-[#f8fafc]">

    {/* NAVBAR */}

    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-xl">

      <div className="mx-auto flex h-auto max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:h-20 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-4">

          <img
            src="/logo-re.png"
            alt="FestFlow"
            className="h-14 w-auto"
          />

          <div>

            <h1 className="text-2xl font-extrabold text-slate-900">

              FestFlow

            </h1>

            <p className="text-sm text-slate-500">

              Welcome, {studentId}

            </p>

          </div>

        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">

          <button
            onClick={() => navigate("/my-events")}
            className="rounded-xl border border-slate-200 px-4 py-2 font-semibold transition hover:bg-slate-100"
          >
            <History className="mr-2 inline h-4 w-4" />
            My Events
          </button>

          <button
            onClick={() => navigate("/my-certificates")}
            className="rounded-xl border border-slate-200 px-4 py-2 font-semibold transition hover:bg-slate-100"
          >
            Certificates
          </button>

          <button
            onClick={handleLogout}
            className="rounded-xl bg-red-600 px-5 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            <LogOut className="mr-2 inline h-4 w-4" />
            Logout
          </button>

        </div>

      </div>

    </header>

    {/* HERO */}

    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600">

      <div className="absolute inset-0 bg-black/10" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-6 lg:py-20">

        <div className="max-w-3xl">

          <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur">

            Student Dashboard

          </span>

          <h2 className="mt-8 text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">

            Explore

            <br />

            Upcoming Events

          </h2>

          <p className="mt-8 text-xl leading-9 text-white/90">

            Register for workshops,

            hackathons,

            technical competitions,

            seminars,

            and campus activities.

          </p>

          <div className="mt-12 flex flex-wrap gap-4">

            <div className="rounded-2xl bg-white/15 px-6 py-5 backdrop-blur-xl">

              <p className="text-sm text-white/70">

                Published Events

              </p>

              <h3 className="mt-2 text-3xl font-bold text-white">

                {events.length}

              </h3>

            </div>

            <div className="rounded-2xl bg-white/15 px-6 py-5 backdrop-blur-xl">

              <p className="text-sm text-white/70">

                Registered

              </p>

              <h3 className="mt-2 text-3xl font-bold text-white">

                {registrations.length}

              </h3>

            </div>

          </div>

        </div>

      </div>

    </section>

    {/* EVENTS */}

    <main className="mx-auto -mt-10 max-w-7xl px-6 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="overflow-hidden rounded-3xl border border-white/40 bg-white shadow-xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
          >
            <div className="relative h-52 overflow-hidden">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="h-full w-full object-cover transition duration-500 hover:scale-105"
              />
              <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white">
                Registration Open
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{event.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                  {event.description}
                </p>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-pink-600" />
                  {event.date}
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  {event.time}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-red-500" />
                  {event.location}
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-emerald-600" />
                  {event.registered} / {event.capacity} Registered
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">
                  {event.category}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {event.eventType === "team" ? `${event.teamSize} Members` : "Solo"}
                </span>
              </div>

              <button
                onClick={() => handleRegister(event.id)}
                className="group flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 font-bold text-white transition hover:opacity-90"
              >
                Register Now
                <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
          <h3 className="text-2xl font-bold text-slate-700">No Events Available</h3>
          <p className="mt-3 text-slate-500">
            Organizers haven't published any events yet.
          </p>
        </div>
      )}
    </main>

    {/* Registration Form Modal */}
    <RegistrationForm
      open={showRegistrationForm}
      onOpenChange={setShowRegistrationForm}
      event={selectedEvent}
      onSubmit={handleRegistrationSubmit}
    />

    {/* Digital Ticket Modal */}
    <DigitalTicket
      open={showTicket}
      onOpenChange={setShowTicket}
      event={selectedEvent}
      ticketCode={ticketCode}
      studentId={studentId}
    />

  </div>
  );
};

export default StudentDashboard;
