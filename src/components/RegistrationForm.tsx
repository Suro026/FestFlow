import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    if (!teamName.trim()) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Event Registration
          </DialogTitle>
          <DialogDescription>
            Register for <span className="font-semibold text-foreground">{event.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="teamName">Team/Group Name *</Label>
            <Input
              id="teamName"
              placeholder="e.g., Tech Enthusiasts or Your Name (for individual)"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Enter your name if registering individually, or a team name for group registration
            </p>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Team Members *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addMember}
                disabled={members.length >= 5}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            </div>

            <div className="space-y-4">
              {members.map((member, index) => (
                <div key={member.id} className="p-4 border rounded-lg space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Member {index + 1}</h4>
                    {members.length > 1 && (
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
                        placeholder="John Doe"
                        value={member.name}
                        onChange={(e) => updateMember(member.id, 'name', e.target.value)}
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
                        placeholder="john@university.edu"
                        value={member.email}
                        onChange={(e) => updateMember(member.id, 'email', e.target.value)}
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
                        onChange={(e) => updateMember(member.id, 'studentId', e.target.value)}
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
      </DialogContent>
    </Dialog>
  );
};

export default RegistrationForm;
