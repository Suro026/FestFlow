export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'Academic' | 'Sports' | 'Cultural' | 'Workshop' | 'Social';
  capacity: number;
  registered: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  imageUrl?: string;
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
