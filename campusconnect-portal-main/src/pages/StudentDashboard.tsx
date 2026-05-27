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
    const randomNum = Math.floor(Math.random() * 9999) + 1000;
    return `TKT-${randomNum}`;
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

  const handleRegistrationSubmit = (data: { teamName: string; members: any[] }) => {
    if (!selectedEvent) return;

    const newTicketCode = generateTicketCode();
    
    const newRegistration: Registration = {
      eventId: selectedEvent.id,
      studentId,
      ticketCode: newTicketCode,
      registeredAt: new Date().toISOString(),
    };

    // Save registration
    const updatedRegistrations = [...registrations, newRegistration];
    setRegistrations(updatedRegistrations);
    localStorage.setItem(`registrations_${studentId}`, JSON.stringify(updatedRegistrations));

    // Close form and show ticket
    setShowRegistrationForm(false);
    setTicketCode(newTicketCode);
    setShowTicket(true);
    
    toast.success(`Successfully registered for ${selectedEvent.title}!`, {
      description: `Team: ${data.teamName} | ${data.members.length} member(s)`,
    });
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
                <h1 className="text-xl font-bold">Student Portal</h1>
                <p className="text-sm text-primary-foreground/80">Welcome, Student {studentId}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/my-events')} 
                variant="secondary"
                size="sm"
              >
                <History className="h-4 w-4 mr-2" />
                My Events
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-primary via-primary-light to-primary rounded-xl p-8 mb-8 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="h-8 w-8" />
            <h2 className="text-3xl font-bold">Upcoming Campus Events</h2>
          </div>
          <p className="text-lg text-primary-foreground/90">
            Discover and register for exciting events happening on campus
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
