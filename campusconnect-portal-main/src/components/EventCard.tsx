import { Event } from '@/types/events';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface EventCardProps {
  event: Event;
  onRegister?: (eventId: string) => void;
}

const EventCard = ({ event, onRegister }: EventCardProps) => {
  const isFull = event.registered >= event.capacity;
  const availableSeats = event.capacity - event.registered;

  const getCategoryColor = (category: Event['category']) => {
    const colors = {
      Academic: 'bg-primary text-primary-foreground',
      Sports: 'bg-success text-success-foreground',
      Cultural: 'bg-accent text-accent-foreground',
      Workshop: 'bg-primary-light text-primary-foreground',
      Social: 'bg-muted text-muted-foreground',
    };
    return colors[category];
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {event.imageUrl && (
        <div className="h-48 overflow-hidden">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2 mb-2">
          <CardTitle className="text-xl line-clamp-2">{event.title}</CardTitle>
          <Badge className={getCategoryColor(event.category)}>{event.category}</Badge>
        </div>
        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>{event.time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4" />
          <span className={isFull ? 'text-destructive font-medium' : 'text-foreground'}>
            {event.registered} / {event.capacity} registered
          </span>
        </div>
        {!isFull && (
          <p className="text-sm text-success font-medium">{availableSeats} seats available</p>
        )}
      </CardContent>
      <CardFooter>
        {event.status === 'Upcoming' && (
          isFull ? (
            <Button disabled className="w-full" variant="secondary">
              Full
            </Button>
          ) : (
            <Button onClick={() => onRegister?.(event.id)} className="w-full">
              Register
            </Button>
          )
        )}
        {event.status === 'Ongoing' && (
          <Button disabled className="w-full" variant="outline">
            Ongoing
          </Button>
        )}
        {event.status === 'Completed' && (
          <Button disabled className="w-full" variant="outline">
            Completed
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCard;
