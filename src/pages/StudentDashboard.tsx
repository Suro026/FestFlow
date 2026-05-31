import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, Sparkles, History } from 'lucide-react';
import { MOCK_EVENTS } from '@/data/mockEvents';
import EventCard from '@/components/EventCard';
import DigitalTicket from '@/components/DigitalTicket';
import RegistrationForm from '@/components/RegistrationForm';
import { Event, Registration } from '@/types/events';
import { toast } from 'sonner';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [ticketCode, setTicketCode] = useState('');
  const [showTicket, setShowTicket] = useState(false);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  useEffect(() => {
    // Check if user is logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const storedStudentId = sessionStorage.getItem('studentId');
    
    if (!isLoggedIn || !storedStudentId) {
      navigate('/student-login');
      return;
    }
    
    setStudentId(storedStudentId);
    
    // Load existing registrations
    const stored = localStorage.getItem(`registrations_${storedStudentId}`);
    if (stored) {
      setRegistrations(JSON.parse(stored));
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('studentId');
    toast.success('Logged out successfully');
    navigate('/student-login');
  };

  const generateTicketCode = () => {
  return (
    "B2B-" +
    Date.now().toString().slice(-6) +
    Math.random().toString(36).substring(2, 5).toUpperCase()
  );
};

  const handleRegister = (eventId: string) => {
    const event = MOCK_EVENTS.find(e => e.id === eventId);
    if (!event) return;

    if (event.registered >= event.capacity) {
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
    members: data.members,
    attendance: false,
    registeredAt: serverTimestamp(),
  });

  setRegistrations([...registrations, newRegistration]);

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">TechSpire Events Portal</h1>
                <p className="text-sm text-blue-100">Student ID: {studentId}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/my-events')} 
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <History className="h-4 w-4 mr-2" />
                My Events
              </Button>
              <Button 
                onClick={handleLogout} 
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-8 mb-10 text-white shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-8 w-8" />
            <h2 className="text-4xl font-bold">Upcoming Campus Events</h2>
          </div>
          <p className="text-lg text-blue-50">
            Discover, register, and participate in exciting events happening on campus. Build your skills and connect with peers.
          </p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_EVENTS.map((event) => (
            <EventCard 
              key={event.id} 
              event={event} 
              onRegister={handleRegister}
            />
          ))}
        </div>

        {MOCK_EVENTS.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">No events available at the moment</p>
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
