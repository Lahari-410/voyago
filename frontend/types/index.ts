// Shared TypeScript types for the frontend
// Import these wherever you need type safety

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface Booking {
  _id: string;
  userId: string;
  pnr: string;
  journeyType: 'train' | 'flight';
  trainNumber?: string;
  flightNumber?: string;
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  coachNumber?: string;
  seatNumber: string;
  passengerName: string;
  status: 'upcoming' | 'active' | 'completed';
  roomId?: string | Room;
  stripePaymentIntentId?: string;
  ticketEmailed: boolean;
  createdAt: string;
}

export interface Message {
  userId: string;
  userName: string;
  text: string;
  type: 'text' | 'issue' | 'system';
  timestamp: string;
}

export interface Room {
  _id: string;
  pnr: string;
  journeyType: 'train' | 'flight';
  from: string;
  to: string;
  departureTime: string;
  arrivalTime: string;
  participants: User[];
  messages: Message[];
  issues: string[];
  status: 'active' | 'closed';
}

export interface CabSplitParticipant {
  userId: string;
  userName: string;
  share: number;
  paid: boolean;
  stripePaymentIntentId?: string;
}

export interface CabSplit {
  _id: string;
  roomId: string;
  createdBy: string;
  totalAmount: number;
  destination: string;
  participants: CabSplitParticipant[];
  status: 'pending' | 'partial' | 'completed';
  createdAt: string;
}
