import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, QrCode, Calendar, Users, TrendingUp } from 'lucide-react';
import { MOCK_EVENTS } from '@/data/mockEvents';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [totalRegistrations, setTotalRegistrations] = useState(0);

  useEffect(() => {
    // Check if admin is logged in
    const isLoggedIn = sessionStorage.getItem('isAdminLoggedIn');
    const storedAdminId = sessionStorage.getItem('adminId');
    
    if (!isLoggedIn || !storedAdminId) {
      navigate('/admin-login');
      return;
    }
    
    setAdminId(storedAdminId);

    // Count total registrations from all students
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('registrations_')) {
        const registrations = JSON.parse(localStorage.getItem(key) || '[]');
        count += registrations.length;
      }
    }
    setTotalRegistrations(count);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const stats = [
    {
      title: 'Total Events',
      value: MOCK_EVENTS.length,
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
      title: 'Upcoming Events',
      value: MOCK_EVENTS.filter(e => e.status === 'Upcoming').length,
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10'
    },
    {
      title: 'Total Capacity',
      value: MOCK_EVENTS.reduce((sum, e) => sum + e.capacity, 0),
      icon: Users,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  ];

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
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-destructive-foreground/80">Welcome, {adminId}</p>
              </div>
            </div>
            
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
              {MOCK_EVENTS.map((event) => (
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
                      {event.registered} / {event.capacity}
                    </p>
                    <p className="text-xs text-muted-foreground">Registered</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
