import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, ArrowLeft, Calendar, MapPin, Clock, Users, Download } from 'lucide-react';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { Event } from '@/types/events';
import { toast } from 'sonner';

const EventManagement = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const storedAdminId = sessionStorage.getItem('adminId');
    
    if (!isLoggedIn || !storedAdminId) {
      navigate('/admin-login');
      return;
    }
    
    setAdminId(storedAdminId);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const getEventRegistrations = (eventId: string) => {
    const registrations = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('registrations_')) {
        const studentRegs = JSON.parse(localStorage.getItem(key) || '[]');
        const eventRegs = studentRegs.filter((r: any) => r.eventId === eventId);
        registrations.push(...eventRegs.map((r: any) => ({
          ...r,
          studentId: key.replace('registrations_', '')
        })));
      }
    }
    return registrations;
  };

  const handleExportRegistrations = (event: Event) => {
    const registrations = getEventRegistrations(event.id);
    
    if (registrations.length === 0) {
      toast.error('No registrations to export');
      return;
    }

    const csv = [
      ['Event', 'Student ID', 'Ticket Code', 'Registration Date'],
      ...registrations.map(r => [
        event.title,
        r.studentId,
        r.ticketCode,
        new Date(r.registeredAt).toLocaleString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;
    a.click();
    
    toast.success('Registrations exported!');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-destructive text-destructive-foreground shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive-foreground/10 flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Event Management</h1>
                <p className="text-sm text-destructive-foreground/80">Admin: {adminId}</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => navigate('/admin-dashboard')} 
                variant="secondary"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
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
        <div className="grid gap-6">
          {MOCK_EVENTS.map((event) => {
            const registrations = getEventRegistrations(event.id);
            const registrationCount = registrations.length;

            return (
              <Card key={event.id} className="overflow-hidden">
                <CardHeader className={`${event.imageUrl ? 'pb-4' : ''}`}>
                  {event.imageUrl && (
                    <div className="h-48 -mt-6 -mx-6 mb-4 overflow-hidden">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-2xl">{event.title}</CardTitle>
                        <Badge 
                          className={
                            event.status === 'Upcoming' 
                              ? 'bg-primary' 
                              : event.status === 'Ongoing' 
                              ? 'bg-accent' 
                              : 'bg-muted'
                          }
                        >
                          {event.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        {event.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Event Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{event.location}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Capacity</span>
                        </div>
                        <span className="text-lg font-bold">{event.capacity}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">Registered</span>
                        </div>
                        <span className="text-lg font-bold text-success">{registrationCount}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Available</span>
                        </div>
                        <span className="text-lg font-bold text-primary">
                          {event.capacity - registrationCount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedEvent(event)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="default"
                      onClick={() => handleExportRegistrations(event)}
                      disabled={registrationCount === 0}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  {/* Registration List */}
                  {selectedEvent?.id === event.id && registrations.length > 0 && (
                    <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                      <h4 className="font-semibold mb-3">Registered Students</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {registrations.map((reg: any) => (
                          <div key={reg.ticketCode} className="flex items-center justify-between p-2 bg-background rounded text-sm">
                            <div>
                              <span className="font-medium">Student {reg.studentId}</span>
                              <span className="text-muted-foreground ml-2">• {reg.ticketCode}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(reg.registeredAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default EventManagement;
