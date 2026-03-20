import mongoose, { Document, Schema } from 'mongoose';

// CabSplit is when passengers in the same room want to split a cab fare
// One person creates it, others join and pay their share via Stripe

export interface ICabSplitParticipant {
  userId: mongoose.Types.ObjectId;
  userName: string;
  share: number;        // amount this person owes in rupees
  paid: boolean;
  stripePaymentIntentId?: string;
}

export interface ICabSplit extends Document {
  roomId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  totalAmount: number;
  destination: string;
  participants: ICabSplitParticipant[];
  status: 'pending' | 'partial' | 'completed';
  createdAt: Date;
}

const ParticipantSchema = new Schema<ICabSplitParticipant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    share: { type: Number, required: true },
    paid: { type: Boolean, default: false },
    stripePaymentIntentId: String,
  },
  { _id: false }
);

const CabSplitSchema = new Schema<ICabSplit>(
  {
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount: { type: Number, required: true },
    destination: { type: String, required: true },
    participants: [ParticipantSchema],
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

export default mongoose.model<ICabSplit>('CabSplit', CabSplitSchema);
