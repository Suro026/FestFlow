export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
  capacity: number;
  registered: number;
  status: string;
  imageUrl: string;

  eventType?: "solo" | "team";
  teamSize?: number;
  registrationOpen?: boolean;
}

export interface Registration {
  eventId: string;
  studentId: string;
  ticketCode: string;
  registeredAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
}
