import mongoose, { Document, Schema } from 'mongoose';

// A Booking represents one passenger's ticket
// Multiple bookings with the same PNR = same journey = same live room

export interface IBooking extends Document {
  userId: mongoose.Types.ObjectId;
  pnr: string;             // ticket ID like "1234567890"
  journeyType: 'train' | 'flight';
  trainNumber?: string;
  flightNumber?: string;
  from: string;            // origin station/airport
  to: string;              // destination station/airport
  departureTime: Date;
  arrivalTime: Date;
  coachNumber?: string;    // for trains, e.g. "S3"
  seatNumber: string;      // e.g. "34" or "12A"
  passengerName: string;
  status: 'upcoming' | 'active' | 'completed';
  roomId?: mongoose.Types.ObjectId;  // linked live room
  stripePaymentIntentId?: string;    // Stripe payment ID
  ticketEmailed: boolean;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',   // references the User collection
      required: true,
    },
    pnr: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    journeyType: {
      type: String,
      enum: ['train', 'flight'],
      required: true,
    },
    trainNumber: String,
    flightNumber: String,
    from: { type: String, required: true },
    to: { type: String, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    coachNumber: String,
    seatNumber: { type: String, required: true },
    passengerName: { type: String, required: true },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed'],
      default: 'upcoming',
    },
    roomId: {
      type: Schema.Types.ObjectId,
      ref: 'Room',
    },
    stripePaymentIntentId: String,
    ticketEmailed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index on PNR so we can quickly find all passengers with same PNR
// This is how we match passengers into the same room
BookingSchema.index({ pnr: 1 });
BookingSchema.index({ userId: 1 });
BookingSchema.index({ status: 1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);
