import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, LogOut, ArrowLeft, Calendar, MapPin, Clock, Users, Download } from 'lucide-react';
import { Event } from '@/types/events';
import { toast } from 'sonner';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EventManagement = () => {
  const [allRegistrations, setAllRegistrations] = useState<any[]>([]);
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);

const [editingEvent, setEditingEvent] =
  useState<Event | null>(null);

const [formData, setFormData] = useState({
  title: "",
  description: "",
  date: "",
  time: "",
  venue: "",
  capacity: 100,
  imageUrl: "",
  eventType: "solo",
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
      const snapshot = await getDocs(
        collection(db, "eventRegistrations")
      );

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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
      console.log("Firestore Events:", eventsData);

      setEvents(eventsData);
      console.log("State Updated");
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
  return allRegistrations.filter(
    reg => reg.eventId === eventId
  );
};

  const handleExportRegistrations = (event: Event) => {
    const registrations = getEventRegistrations(event.id);
    
    if (registrations.length === 0) {
      toast.error('No registrations to export');
      return;
    }

    const csvRows = [
  [
    "Event",
    "Student Email",
    "Ticket Code",
    "Team Name",
    "Member Name",
    "Member Email",
    "Member Student ID",
    "Attendance"
  ]
];

registrations.forEach((r: any) => {
  // Solo Event
  if (!r.members || r.members.length === 0) {
    csvRows.push([
      r.eventTitle || event.title,
      r.studentId,
      r.ticketCode,
      r.teamName || "Solo",
      "",
      "",
      "",
      r.attendance ? "Present" : "Absent"
    ]);
  }

  // Team Event
  else {
    r.members.forEach((member: any) => {
      csvRows.push([
        r.eventTitle || event.title,
        r.studentId,
        r.ticketCode,
        r.teamName || "",
        member.name || "",
        member.email || "",
        member.studentId || "",
        r.attendance ? "Present" : "Absent"
      ]);
    });
  }
});

const csv = csvRows.map(row => row.join(",")).join("\n");

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
    await deleteDoc(doc(db, "events", eventId));

    setEvents(prev =>
      prev.filter(e => e.id !== eventId)
    );

    toast.success("Event deleted");
  } catch (error) {
    console.error(error);
    toast.error("Delete failed");
  }
};

const handleToggleRegistration = async (
  eventId: string,
  currentStatus: boolean
) => {
  try {
    await updateDoc(
      doc(db, "events", eventId),
      {
        registrationOpen: !currentStatus,
      }
    );

    setEvents(prev =>
      prev.map(e =>
        e.id === eventId
          ? {
              ...e,
              registrationOpen: !currentStatus,
            }
          : e
      )
    );

    toast.success(
      currentStatus
        ? "Registration Paused"
        : "Registration Resumed"
    );
  } catch (error) {
    console.error(error);
  }
};
const handleAddEvent = async () => {
  try {
    await addDoc(collection(db, "events"), {
      ...formData,
      registrationOpen: true,
      createdAt: serverTimestamp(),
    });

    toast.success("Event Created");

    window.location.reload();
  } catch (error) {
    console.error(error);
  }
};

const handleUpdateEvent = async () => {
  if (!editingEvent) return;

  try {
    await updateDoc(
      doc(db, "events", editingEvent.id),
      {
        ...formData,
      }
    );

    toast.success("Event Updated");

    window.location.reload();
  } catch (error) {
    console.error(error);
  }
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
        <div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl font-bold">
    Manage Events
  </h2>

  <Button
    onClick={() => {
      setEditingEvent(null);

      setFormData({
        title: "",
        description: "",
        date: "",
        time: "",
        venue: "",
        capacity: 100,
        imageUrl: "",
        eventType: "solo",
        teamSize: 1,
      });

      setShowEventModal(true);
    }}
  >
    + Add Event
  </Button>
</div>
        <div className="grid gap-6">
          {events.map((event) => {
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
                  <div className="flex flex-wrap gap-2 pt-2">
  <Button
    variant="outline"
    onClick={() => setSelectedEvent(event)}
  >
    View Details
  </Button>

  <Button
    variant="secondary"
    onClick={() =>
      handleToggleRegistration(
        event.id,
        event.registrationOpen ?? true
      )
    }
  >
    {event.registrationOpen
      ? "Pause"
      : "Resume"}
  </Button>

  <Button
  variant="outline"
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
      eventType: event.eventType || "solo",
      teamSize: event.teamSize || 1,
    });

    setShowEventModal(true);
  }}
>
  Edit
</Button>

  <Button
    variant="destructive"
    onClick={() =>
      handleDeleteEvent(event.id)
    }
  >
    Delete
  </Button>

  <Button
    onClick={() =>
      handleExportRegistrations(event)
    }
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
  {reg.registeredAt?.seconds
    ? new Date(reg.registeredAt.seconds * 1000).toLocaleDateString()
    : "N/A"}
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
      <Dialog
  open={showEventModal}
  onOpenChange={setShowEventModal}
>
  <DialogContent className="max-w-xl">
    <DialogHeader>
      <DialogTitle>
        {editingEvent
          ? "Edit Event"
          : "Add Event"}
      </DialogTitle>
    </DialogHeader>

    <div className="space-y-4">

      <div>
        <Label>Event Title</Label>
        <Input
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
          value={formData.description}
          onChange={(e) =>
            setFormData({
              ...formData,
              description: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Date</Label>
        <Input
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
          value={formData.time}
          onChange={(e) =>
            setFormData({
              ...formData,
              time: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Venue</Label>
        <Input
          value={formData.venue}
          onChange={(e) =>
            setFormData({
              ...formData,
              venue: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Capacity</Label>
        <Input
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
        <Label>Image URL</Label>
        <Input
          value={formData.imageUrl}
          onChange={(e) =>
            setFormData({
              ...formData,
              imageUrl: e.target.value,
            })
          }
        />
      </div>

      <div>
        <Label>Event Type</Label>

        <select
          className="w-full border rounded-md p-2"
          value={formData.eventType}
          onChange={(e) =>
            setFormData({
              ...formData,
              eventType: e.target.value,
            })
          }
        >
          <option value="solo">
            Solo
          </option>

          <option value="team">
            Team
          </option>
        </select>
      </div>

      {formData.eventType === "team" && (
        <div>
          <Label>Team Size</Label>
          <Input
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

      <Button
        className="w-full"
        onClick={
          editingEvent
            ? handleUpdateEvent
            : handleAddEvent
        }
      >
        {editingEvent
          ? "Update Event"
          : "Create Event"}
      </Button>

    </div>
  </DialogContent>
</Dialog>
    </div>
  );
};

export default EventManagement;
