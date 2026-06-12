import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, QrCode, Calendar, Users, TrendingUp } from 'lucide-react';
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

  const stats = [
    {
      title: 'Total Events',
      value: events.length,
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10'
    },
    {
      title: 'Total Registrations',
      value: totalRegistrations,
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
  title: 'Attendance Marked',
  value: totalAttendance,
  icon: TrendingUp,
  color: 'text-accent',
  bgColor: 'bg-accent/10'
},
    {
      title: 'Total Capacity',
      value: totalCapacity,
      icon: Users,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-sm text-blue-100">Welcome, {adminId}</p>
              </div>
            </div>
            
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-2xl p-8 mb-10 text-white shadow-xl">
  <h2 className="text-4xl font-bold mb-4">
    Event Management Dashboard
  </h2>

  <p className="text-lg text-blue-50">
    Manage registrations, attendance, food distribution,
    certificates and event operations.
  </p>
</div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`h-10 w-10 rounded-full ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/attendance-scanner')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Attendance Scanner</CardTitle>
                  <CardDescription>Scan student QR codes for event check-in</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/event-management')}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-success" />
                </div>
                <div>
                  <CardTitle>Event Management</CardTitle>
                  <CardDescription>View and manage all campus events</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Events Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Events Overview</CardTitle>
            <CardDescription>Quick view of all campus events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.map((event) => {

  const registrationCount = allRegistrations.filter(
    (reg) => reg.eventId === event.id
  ).length;

  return (
                <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold">{event.title}</h3>
                      <Badge variant={event.status === 'Upcoming' ? 'default' : 'secondary'}>
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.date).toLocaleDateString()} • {event.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {registrationCount} / {event.capacity}
                    </p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                </div>
              );
})}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
    );
};

export default AdminDashboard;