import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  Download,
  LayoutDashboard,
  CalendarDays,
  Search,
  Bell,
  HelpCircle,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Pause,
  Play,
  Settings,
  UserRound,
} from 'lucide-react';
import { Event } from '@/types/events';
import { toast } from 'sonner';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// FestFlow brand tokens (matches the FestFlow Admin mock-ups)
const BRAND = {
  primary: '#b10e6b',
  secondary: '#4648d4',
  primaryContainer: '#d23284',
  onSurfaceVariant: '#574048',
  surfaceContainerLow: '#f0f3ff',
  surfaceContainerHigh: '#dee8ff',
  outlineVariant: '#debec8',
  background: '#f9f9ff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',
};

const gradientStyle = {
  backgroundImage: `linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.secondary} 100%)`,
};

const EventManagement = () => {
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    capacity: 100,
    imageUrl: '',
    eventType: 'solo',
    teamSize: 1,
  });

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

  useEffect(() => {
    const loadRegistrations = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'eventRegistrations'));

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setAllRegistrations(data);
      } catch (error) {
        console.error(error);
      }
    };

    loadRegistrations();
  }, []);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'events'));

        const eventsData: Event[] = snapshot.docs.map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            date: data.date || '',
            time: data.time || '',
            location: data.venue || '',

            category: 'Event',

            capacity: Number(data.capacity) || 0,
            registered: 0,
            status: 'Upcoming',
            imageUrl: data.imageUrl || '',
            eventType: data.eventType || 'team',
            teamSize: data.teamSize || 1,
            registrationOpen: data.registrationOpen ?? true,
          };
        });
        console.log('Firestore Events:', eventsData);

        setEvents(eventsData);
        console.log('State Updated');
      } catch (error) {
        console.error(error);
      }
    };

    loadEvents();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('isAdminLoggedIn');
    sessionStorage.removeItem('adminId');
    toast.success('Logged out successfully');
    navigate('/admin-login');
  };

  const getEventRegistrations = (eventId: string) => {
    return allRegistrations.filter((reg) => reg.eventId === eventId);
  };

  const handleExportRegistrations = (event: Event) => {
    const registrations = getEventRegistrations(event.id);

    if (registrations.length === 0) {
      toast.error('No registrations to export');
      return;
    }

    const csvRows = [
      [
        'Event',
        'Student Email',
        'Ticket Code',
        'Team Name',
        'Member Name',
        'Member Email',
        'Member Student ID',
        'Attendance',
      ],
    ];

    registrations.forEach((r: any) => {
      // Solo Event
      if (!r.members || r.members.length === 0) {
        csvRows.push([
          r.eventTitle || event.title,
          r.studentId,
          r.ticketCode,
          r.teamName || 'Solo',
          '',
          '',
          '',
          r.attendance ? 'Present' : 'Absent',
        ]);
      }

      // Team Event
      else {
        r.members.forEach((member: any) => {
          csvRows.push([
            r.eventTitle || event.title,
            r.studentId,
            r.ticketCode,
            r.teamName || '',
            member.name || '',
            member.email || '',
            member.studentId || '',
            r.attendance ? 'Present' : 'Absent',
          ]);
        });
      }
    });

    const csv = csvRows.map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_')}_registrations.csv`;
    a.click();

    toast.success('Registrations exported!');
  };
  const handleDeleteEvent = async (eventId: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));

      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      toast.success('Event deleted');
    } catch (error) {
      console.error(error);
      toast.error('Delete failed');
    }
  };

  const handleToggleRegistration = async (
    eventId: string,
    currentStatus: boolean
  ) => {
    try {
      await updateDoc(doc(db, 'events', eventId), {
        registrationOpen: !currentStatus,
      });

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                registrationOpen: !currentStatus,
              }
            : e
        )
      );

      toast.success(currentStatus ? 'Registration Paused' : 'Registration Resumed');
    } catch (error) {
      console.error(error);
    }
  };
  const handleAddEvent = async () => {
    try {
      await addDoc(collection(db, 'events'), {
        ...formData,
        registrationOpen: true,
        createdAt: serverTimestamp(),
      });

      toast.success('Event Created');

      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateEvent = async () => {
    if (!editingEvent) return;

    try {
      await updateDoc(doc(db, 'events', editingEvent.id), {
        ...formData,
      });

      toast.success('Event Updated');

      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  };

  const filteredEvents = events.filter((event) =>
    [event.title, event.description, event.location]
      .join(' ')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditingEvent(null);

    setFormData({
      title: '',
      description: '',
      date: '',
      time: '',
      venue: '',
      capacity: 100,
      imageUrl: '',
      eventType: 'solo',
      teamSize: 1,
    });

    setShowEventModal(true);
  };

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: BRAND.background, color: '#111c2d' }}
    >
      {/* SideNavBar */}
      <aside
        className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 px-4 z-50"
        style={{
          background: '#ffffff',
          boxShadow: '4px 0 24px -10px rgba(30,41,59,0.1)',
        }}
      >
        <div className="mb-10 px-4">
          <h1
            className="text-2xl font-extrabold tracking-tight"
            style={{ color: BRAND.primary }}
          >
            FestFlow
          </h1>
          <p className="text-xs opacity-60">Admin: {adminId}</p>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#f0f3ff]"
            style={{ color: BRAND.onSurfaceVariant }}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Dashboard</span>
          </button>
          <div
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold"
            style={{ background: '#fde8f1', color: BRAND.primaryContainer }}
          >
            <CalendarDays className="h-5 w-5" />
            <span>Events</span>
          </div>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#f0f3ff]"
            style={{ color: BRAND.onSurfaceVariant }}
          >
            <Users className="h-5 w-5" />
            <span>Users</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-[#f0f3ff]"
            style={{ color: BRAND.onSurfaceVariant }}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="mt-auto space-y-2 px-1">
          <button
            onClick={openAddModal}
            className="w-full text-white py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
            style={gradientStyle}
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* TopAppBar */}
      <header
        className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 flex justify-between items-center px-8"
        style={{
          background: 'rgba(249,249,255,0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${BRAND.outlineVariant}30`,
        }}
      >
        <div className="flex items-center flex-1 max-w-md">
          <div className="relative w-full">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50"
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-none rounded-full text-sm focus:ring-2 focus:outline-none"
              style={{ background: BRAND.surfaceContainerLow }}
              placeholder="Search events, venues..."
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-full hover:bg-[#f0f3ff] opacity-70">
            <Bell className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full hover:bg-[#f0f3ff] opacity-70">
            <HelpCircle className="h-5 w-5" />
          </button>
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
            style={gradientStyle}
          >
            {adminId ? adminId.slice(0, 2).toUpperCase() : <UserRound className="h-4 w-4" />}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-24 px-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Manage Events</h2>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                style={{ background: '#fde8f1', color: BRAND.primaryContainer }}
              >
                {events.length} Total Events
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin-dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-[#f0f3ff] transition-colors self-start"
            style={{ borderColor: BRAND.outlineVariant, color: BRAND.onSurfaceVariant }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="grid gap-8">
          {filteredEvents.map((event) => {
            const registrations = getEventRegistrations(event.id);
            const registrationCount = registrations.length;
            const capacity = event.capacity || 0;
            const pct = capacity > 0 ? Math.min(100, Math.round((registrationCount / capacity) * 100)) : 0;

            return (
              <article
                key={event.id}
                className="rounded-xl overflow-hidden border transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: '#ffffff',
                  borderColor: `${BRAND.outlineVariant}30`,
                  boxShadow: '0 10px 25px -5px rgba(30,41,59,0.08)',
                }}
              >
                <div className="relative h-56 w-full">
                  {event.imageUrl ? (
                    <img
                      src={event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" style={gradientStyle} />
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                      style={{ background: BRAND.secondary }}
                    >
                      {event.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur shadow-lg">
                      {event.eventType === 'team' ? `Team (${event.teamSize})` : 'Solo'}
                    </span>
                    {!event.registrationOpen && (
                      <span
                        className="px-3 py-1 rounded-full text-xs font-bold text-white shadow-lg"
                        style={{ background: BRAND.onErrorContainer }}
                      >
                        Paused
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-col lg:flex-row justify-between gap-8">
                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-1">{event.title}</h3>
                      <p className="opacity-70 mb-6">{event.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: BRAND.surfaceContainerHigh }}
                          >
                            <Calendar className="h-4 w-4" style={{ color: BRAND.primary }} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                              Date
                            </p>
                            <p className="font-bold text-sm">
                              {event.date
                                ? new Date(event.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })
                                : 'TBD'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: BRAND.surfaceContainerHigh }}
                          >
                            <Clock className="h-4 w-4" style={{ color: BRAND.primary }} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                              Time
                            </p>
                            <p className="font-bold text-sm">{event.time || 'TBD'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: BRAND.surfaceContainerHigh }}
                          >
                            <MapPin className="h-4 w-4" style={{ color: BRAND.primary }} />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold opacity-60">
                              Location
                            </p>
                            <p className="font-bold text-sm">{event.location || 'TBD'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Registration Pulse */}
                    <div
                      className="w-full lg:w-80 rounded-xl p-5 flex flex-col gap-4"
                      style={{ background: BRAND.surfaceContainerLow }}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider opacity-50">
                        Registration Pulse
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-semibold">
                            Registered ({registrationCount}/{capacity})
                          </span>
                          <span className="text-sm font-bold" style={{ color: BRAND.primary }}>
                            {pct}%
                          </span>
                        </div>
                        <div
                          className="w-full h-3 rounded-full overflow-hidden"
                          style={{ background: BRAND.surfaceContainerHigh }}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, ...gradientStyle }}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div
                          className="p-3 rounded-lg border"
                          style={{ borderColor: `${BRAND.outlineVariant}30`, background: '#ffffff99' }}
                        >
                          <p className="text-[10px] uppercase font-bold opacity-50">Capacity</p>
                          <p className="text-xl font-extrabold">{capacity}</p>
                        </div>
                        <div
                          className="p-3 rounded-lg border"
                          style={{ borderColor: `${BRAND.primary}20`, background: '#fde8f150' }}
                        >
                          <p className="text-[10px] uppercase font-bold opacity-70" style={{ color: BRAND.primary }}>
                            Available
                          </p>
                          <p className="text-xl font-extrabold" style={{ color: BRAND.primary }}>
                            {Math.max(0, capacity - registrationCount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    className="mt-8 pt-6 flex flex-wrap items-center justify-between gap-4 border-t"
                    style={{ borderColor: `${BRAND.outlineVariant}30` }}
                  >
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          setSelectedEvent(selectedEvent?.id === event.id ? null : event)
                        }
                        className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                        style={{ background: BRAND.surfaceContainerHigh }}
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                      <button
                        onClick={() =>
                          handleToggleRegistration(event.id, event.registrationOpen ?? true)
                        }
                        className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                        style={{ background: BRAND.surfaceContainerHigh }}
                      >
                        {event.registrationOpen ? (
                          <>
                            <Pause className="h-4 w-4" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Resume
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingEvent(event);

                          setFormData({
                            title: event.title,
                            description: event.description,
                            date: event.date,
                            time: event.time,
                            venue: event.location,
                            capacity: event.capacity,
                            imageUrl: event.imageUrl,
                            eventType: event.eventType || 'solo',
                            teamSize: event.teamSize || 1,
                          });

                          setShowEventModal(true);
                        }}
                        className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                        style={{ background: BRAND.surfaceContainerHigh }}
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="px-5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                        style={{ background: BRAND.errorContainer, color: BRAND.onErrorContainer }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                    <button
                      onClick={() => handleExportRegistrations(event)}
                      disabled={registrationCount === 0}
                      className="px-5 py-2 rounded-lg border text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: BRAND.secondary, color: BRAND.secondary }}
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>
                  </div>

                  {/* Registration List */}
                  {selectedEvent?.id === event.id && (
                    <div
                      className="mt-4 rounded-xl border overflow-hidden"
                      style={{ borderColor: `${BRAND.outlineVariant}30` }}
                    >
                      <div
                        className="px-6 py-3"
                        style={{ background: `${BRAND.surfaceContainerLow}` }}
                      >
                        <h4 className="font-bold text-sm">
                          Registered Students ({registrations.length})
                        </h4>
                      </div>
                      {registrations.length === 0 ? (
                        <p className="p-6 text-sm opacity-60">No registrations yet.</p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y" style={{ borderColor: `${BRAND.outlineVariant}20` }}>
                          {registrations.map((reg: any) => (
                            <div
                              key={reg.ticketCode}
                              className="flex items-center justify-between px-6 py-4 text-sm hover:bg-[#f9f9ff]"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                  style={gradientStyle}
                                >
                                  {String(reg.studentId || '?').slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold">Student {reg.studentId}</p>
                                  <p className="text-xs opacity-60 font-mono">{reg.ticketCode}</p>
                                </div>
                              </div>
                              <span className="text-xs opacity-60">
                                {reg.registeredAt?.seconds
                                  ? new Date(reg.registeredAt.seconds * 1000).toLocaleDateString()
                                  : 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {filteredEvents.length === 0 && (
            <div
              className="text-center py-16 rounded-xl border"
              style={{ borderColor: `${BRAND.outlineVariant}30`, background: '#ffffff' }}
            >
              <p className="opacity-60">No events found.</p>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Event Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle style={{ color: BRAND.primary }}>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            <div>
              <Label>Event Title</Label>
              <Input
                className="mt-1.5"
                placeholder="e.g. Midnight Summer Hackathon"
                value={formData.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    title: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input
                className="mt-1.5"
                placeholder="What makes this event special?"
                value={formData.description}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    description: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      date: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Time</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. 11:00 AM"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      time: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Venue</Label>
              <Input
                className="mt-1.5"
                placeholder="Main Auditorium or Google Meet"
                value={formData.venue}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    venue: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: Number(e.target.value),
                    })
                  }
                />
              </div>

              <div>
                <Label>Event Type</Label>
                <select
                  className="w-full border rounded-md p-2 mt-1.5 text-sm"
                  style={{ borderColor: BRAND.outlineVariant }}
                  value={formData.eventType}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      eventType: e.target.value,
                    })
                  }
                >
                  <option value="solo">Solo</option>
                  <option value="team">Team</option>
                </select>
              </div>
            </div>

            {formData.eventType === 'team' && (
              <div>
                <Label>Team Size</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  value={formData.teamSize}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      teamSize: Number(e.target.value),
                    })
                  }
                />
              </div>
            )}

            <div>
              <Label>Image URL</Label>
              <Input
                className="mt-1.5"
                placeholder="https://..."
                value={formData.imageUrl}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    imageUrl: e.target.value,
                  })
                }
              />
            </div>

            <button
              className="w-full text-white py-3 rounded-xl font-bold shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              style={gradientStyle}
              onClick={editingEvent ? handleUpdateEvent : handleAddEvent}
            >
              {editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManagement;