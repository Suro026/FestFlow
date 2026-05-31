import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, ArrowLeft, QrCode, CheckCircle, XCircle, Search } from 'lucide-react';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { toast } from 'sonner';

interface ScannedTicket {
  eventId: string;
  studentId: string;
  ticketCode: string;
  eventTitle: string;
  scannedAt: string;
}

const AttendanceScanner = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scannedTickets, setScannedTickets] = useState<ScannedTicket[]>([]);

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const storedAdminId = sessionStorage.getItem('adminId');
    
    if (!isLoggedIn || !storedAdminId) {
      navigate('/admin-login');
      return;
    }
    
    setAdminId(storedAdminId);

    // Load scanned tickets
    const stored = localStorage.getItem('scanned_tickets');
    if (stored) {
      setScannedTickets(JSON.parse(stored));
    }
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const verifyTicket = (ticketCode: string) => {
    // Search through all registrations
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('registrations_')) {
        const registrations = JSON.parse(localStorage.getItem(key) || '[]');
        const registration = registrations.find((r: any) => r.ticketCode === ticketCode);
        
        if (registration) {
          const event = MOCK_EVENTS.find(e => e.id === registration.eventId);
          if (!event) {
            toast.error('Event not found');
            return;
          }

          // Check if already scanned
          const alreadyScanned = scannedTickets.some(t => t.ticketCode === ticketCode);
          if (alreadyScanned) {
            toast.error('Ticket already scanned!', {
              description: 'This ticket has been used for check-in',
            });
            return;
          }

          // Mark as scanned
          const scannedTicket: ScannedTicket = {
            eventId: registration.eventId,
            studentId: registration.studentId,
            ticketCode: registration.ticketCode,
            eventTitle: event.title,
            scannedAt: new Date().toISOString(),
          };

          const updated = [...scannedTickets, scannedTicket];
          setScannedTickets(updated);
          localStorage.setItem('scanned_tickets', JSON.stringify(updated));

          toast.success('Check-in successful!', {
            description: `${event.title} - Student ${registration.studentId}`,
          });
          setManualCode('');
          return;
        }
      }
    }

    toast.error('Invalid ticket code', {
      description: 'This ticket was not found in the system',
    });
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      toast.error('Please enter a ticket code');
      return;
    }
    verifyTicket(manualCode.trim());
  };

  // Simulate QR scanner (in real app, use device camera)
  const handleQRScan = () => {
    toast.info('QR Scanner would open camera in production', {
      description: 'Use manual entry for demo',
    });
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
                <h1 className="text-xl font-bold">Attendance Scanner</h1>
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
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Scanner Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan Student Tickets
            </CardTitle>
            <CardDescription>
              Scan QR codes or enter ticket codes manually for event check-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Scanner Button */}
            <div className="flex justify-center">
              <Button 
                onClick={handleQRScan} 
                size="lg" 
                className="w-full max-w-md"
                variant="destructive"
              >
                <QrCode className="h-5 w-5 mr-2" />
                Open QR Scanner
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or enter manually
                </span>
              </div>
            </div>

            {/* Manual Entry */}
            <form onSubmit={handleManualVerify} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter ticket code (e.g., TKT-1234)"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Button type="submit">
                  <Search className="h-4 w-4 mr-2" />
                  Verify
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Check-ins Today</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{scannedTickets.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Unique Events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {new Set(scannedTickets.map(t => t.eventId)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <CardDescription>Latest scanned tickets</CardDescription>
          </CardHeader>
          <CardContent>
            {scannedTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No check-ins yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...scannedTickets].reverse().slice(0, 10).map((ticket) => (
                  <div key={ticket.ticketCode} className="flex items-center justify-between p-3 border rounded-lg bg-success/5">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-medium text-sm">{ticket.eventTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Student {ticket.studentId} • {ticket.ticketCode}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {new Date(ticket.scannedAt).toLocaleTimeString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AttendanceScanner;
