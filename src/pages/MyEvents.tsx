import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, LogOut, History, Calendar, MapPin, Clock, Ticket, Download } from 'lucide-react';
import { Registration } from '@/types/events';
import { MOCK_EVENTS } from '@/data/mockEvents';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';

const MyEvents = () => {
  const navigate = useNavigate();
  const [studentId, setStudentId] = useState('');
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

    // Load registrations from localStorage
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

  const handleDownloadTicket = (registration: Registration) => {
    const event = MOCK_EVENTS.find(e => e.id === registration.eventId);
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Banner */}
        <div className="bg-gradient-to-r from-primary via-primary-light to-primary rounded-xl p-6 mb-8 text-primary-foreground shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <History className="h-7 w-7" />
            <h2 className="text-2xl font-bold">Registration History</h2>
          </div>
          <p className="text-primary-foreground/90">
            You have registered for {registrations.length} event{registrations.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Registrations List */}
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
          <div className="grid gap-6">
            {registrations.map((registration) => {
              const event = MOCK_EVENTS.find(e => e.id === registration.eventId);
              if (!event) return null;

              const qrData = JSON.stringify({
                eventId: event.id,
                studentId: registration.studentId,
                ticketCode: registration.ticketCode,
                eventTitle: event.title,
              });

              return (
                <Card key={registration.ticketCode} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{event.title}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>{event.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>{event.location}</span>
                          </div>
                        </CardDescription>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2 bg-white p-4 rounded-lg">
                        <QRCode
                          id={`qr-${registration.ticketCode}`}
                          value={qrData}
                          size={120}
                          level="H"
                          bgColor="#ffffff"
                          fgColor="#1e40af"
                        />
                        <div className="text-center">
                          <p className="text-xs font-medium text-muted-foreground">Ticket Code</p>
                          <p className="text-sm font-bold text-primary">{registration.ticketCode}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Registered on: {new Date(registration.registeredAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadTicket(registration)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Ticket
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyEvents;
