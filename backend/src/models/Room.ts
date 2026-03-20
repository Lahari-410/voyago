import mongoose, { Document, Schema } from 'mongoose';

// A Room is the "live group chat" for all passengers on the same journey
// Identified by PNR — when PNR matches, passengers land in the same room

export interface IMessage {
  userId: mongoose.Types.ObjectId;
  userName: string;
  text: string;
  type: 'text' | 'issue' | 'system';  // system = auto messages like "user joined"
  timestamp: Date;
}

export interface IRoom extends Document {
  pnr: string;
  journeyType: 'train' | 'flight';
  trainNumber?: string;
  flightNumber?: string;
  from: string;
  to: string;
  departureTime: Date;
  arrivalTime: Date;
  participants: mongoose.Types.ObjectId[];  // array of user IDs in this room
  messages: IMessage[];
  issues: string[];           // reported coach/flight issues
  status: 'active' | 'closed';
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    text: { type: String, required: true },
    type: { type: String, enum: ['text', 'issue', 'system'], default: 'text' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }  // messages don't need their own ID
);

const RoomSchema = new Schema<IRoom>(
  {
    pnr: { type: String, required: true, uppercase: true },
    journeyType: { type: String, enum: ['train', 'flight'], required: true },
    trainNumber: String,
    flightNumber: String,
    from: { type: String, required: true },
    to: { type: String, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [MessageSchema],
    issues: [String],
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Index on PNR so room lookup is instant
RoomSchema.index({ pnr: 1 });
RoomSchema.index({ status: 1 });
// Index on arrivalTime so we can automatically close rooms when journey ends
RoomSchema.index({ arrivalTime: 1 });

export default mongoose.model<IRoom>('Room', RoomSchema);
