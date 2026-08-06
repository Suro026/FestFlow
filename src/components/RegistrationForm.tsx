import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Event } from '@/types/events';
import { Users, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  studentId: string;
}

interface RegistrationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onSubmit: (data: { teamName: string; members: TeamMember[] }) => void;
}

const RegistrationForm = ({ open, onOpenChange, event, onSubmit }: RegistrationFormProps) => {
  const [teamName, setTeamName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([
    { id: '1', name: '', email: '', studentId: '' }
  ]);

  const addMember = () => {
    if (members.length >= 5) {
      toast.error('Maximum 5 team members allowed');
      return;
    }
    setMembers([...members, { id: Date.now().toString(), name: '', email: '', studentId: '' }]);
  };

  const removeMember = (id: string) => {
    if (members.length === 1) {
      toast.error('At least one member is required');
      return;
    }
    setMembers(members.filter(m => m.id !== id));
  };

  const updateMember = (id: string, field: keyof TeamMember, value: string) => {
    setMembers(members.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!isSolo && !teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }

    for (const member of members) {
      if (!member.name.trim() || !member.email.trim() || !member.studentId.trim()) {
        toast.error('Please fill in all member details');
        return;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(member.email)) {
        toast.error(`Invalid email for ${member.name}`);
        return;
      }
    }

    onSubmit({ teamName, members });
    
    // Reset form
    setTeamName('');
    setMembers([{ id: '1', name: '', email: '', studentId: '' }]);
  };

  if (!event) return null;
  const isSolo = event.eventType === "solo";
  console.log("eventType =", event.eventType);
console.log("isSolo =", isSolo);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden border-0 bg-transparent shadow-none">
        <div className="flex flex-col overflow-hidden rounded-3xl bg-white md:flex-row">

  {/* LEFT PANEL */}

  <div className="relative flex flex-col justify-between bg-indigo-950 p-8 text-white md:w-2/5">

    <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-800/40 blur-3xl" />

    <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-700/30 blur-3xl" />

    <div className="relative z-10">

      <div className="mb-3 flex items-center gap-3">

        <Users className="h-8 w-8 text-pink-400" />

        <h2 className="text-3xl font-bold">

          Event Registration

        </h2>

      </div>

      <p className="text-indigo-200">

        Register for

        <span className="ml-1 font-semibold text-white">

          {event.title}

        </span>

      </p>

    </div>

    <div className="relative mt-10 rounded-2xl border border-indigo-700/40 bg-indigo-900/60 p-6 backdrop-blur">

      <h3 className="mb-5 text-sm font-bold uppercase tracking-wider">

        Event Details

      </h3>

      <div className="space-y-4 text-sm">

        <div>

          📅{" "}

          {new Date(event.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}

        </div>

        <div>

          🕐 {event.time}

        </div>

        <div>

          📍 {event.location}

        </div>

        <div className="pt-4">

          <span className="rounded-full bg-emerald-500/10 px-3 py-2 text-emerald-400">

            {event.capacity - event.registered} seats available

          </span>

        </div>

      </div>

    </div>

  </div>

  {/* RIGHT PANEL */}

  <div className="flex flex-1 flex-col bg-white">

        <div className="flex flex-col h-full">

  {/* Header */}

  <div className="flex items-center justify-end border-b border-slate-100 p-6">

    <button
      type="button"
      onClick={() => onOpenChange(false)}
      className="rounded-full bg-slate-100 p-2 transition hover:bg-slate-200"
    >
      <X className="h-5 w-5 text-slate-500" />
    </button>

  </div>

  {/* Scrollable Form */}

  <div className="flex-1 overflow-y-auto p-8">

    <form onSubmit={handleSubmit} className="space-y-8">

          {/* Team Members */}
          {/* Team Name */}
{!isSolo && (
  <div>

    <Label
      htmlFor="teamName"
      className="mb-2 block text-sm font-semibold text-slate-700"
    >
      Team Name *
    </Label>

    <Input
      id="teamName"
      placeholder="Enter Team Name"
      value={teamName}
      onChange={(e) => setTeamName(e.target.value)}
      required
      className="h-12 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
    />

  </div>
)}

{/* Members Section */}
<div className="space-y-4">
  <div className="flex items-center justify-between">

  <h3 className="text-base font-bold text-slate-900">
    {isSolo ? "Participant Details" : "Team Members *"}
  </h3>
    {!isSolo && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addMember}
        disabled={members.length >= (event.teamSize || 5)}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add Member
      </Button>
    )}
  </div>

  <div className="space-y-4">
    {members.map((member, index) => (
      <div
        key={member.id}
        className="p-4 border rounded-lg space-y-3 bg-muted/20"
      >
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">
            {isSolo ? "Participant" : `Member ${index + 1}`}
          </h4>

          {!isSolo && members.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => removeMember(member.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`name-${member.id}`} className="text-xs">
              Full Name *
            </Label>
            <Input
              id={`name-${member.id}`}
              placeholder="Surajit Sadhukhan"
              value={member.name}
              onChange={(e) =>
                updateMember(member.id, "name", e.target.value)
              }
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`email-${member.id}`} className="text-xs">
              Email *
            </Label>
            <Input
              id={`email-${member.id}`}
              type="email"
              placeholder="festflow@example.com"
              value={member.email}
              onChange={(e) =>
                updateMember(member.id, "email", e.target.value)
              }
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`studentId-${member.id}`} className="text-xs">
              Student ID *
            </Label>
            <Input
              id={`studentId-${member.id}`}
              placeholder="STU12345"
              value={member.studentId}
              onChange={(e) =>
                updateMember(member.id, "studentId", e.target.value)
              }
              required
            />
          </div>
        </div>
      </div>
    ))}
            </div>
          </div>

          {/* Event Info */}
          <div className="p-4 bg-primary-lighter rounded-lg border border-primary/20">
            <h4 className="font-medium text-sm mb-2">Event Details</h4>
            <div className="text-sm space-y-1 text-muted-foreground">
              <p>📅 {new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>🕐 {event.time}</p>
              <p>📍 {event.location}</p>
              <p className="text-success font-medium">
                {event.capacity - event.registered} seats available
              </p>
            </div>
          </div>

          {/* Submit */}
<div className="flex gap-3 pt-2">
  <Button
    type="button"
    variant="outline"
    onClick={() => onOpenChange(false)}
    className="flex-1"
  >
    Cancel
  </Button>

  <Button type="submit" className="flex-1">
    Complete Registration
  </Button>
</div>

    </form>

  </div>

</div>

</div>
</div>
    </DialogContent>
  </Dialog>
);
};

export default RegistrationForm;
