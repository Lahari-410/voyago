import { Router, Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import Booking from '../models/Booking';
import Room from '../models/Room';
import redis from '../config/redis';

const router = Router();

// All booking routes require login
router.use(authMiddleware);

// ─── CREATE BOOKING ──────────────────────────────────────────────────────────
// POST /api/bookings
// Books a seat and joins/creates a live room for this PNR

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      pnr, journeyType, trainNumber, flightNumber,
      from, to, departureTime, arrivalTime,
      coachNumber, seatNumber, passengerName,
    } = req.body;

    if (!pnr || !journeyType || !from || !to || !seatNumber) {
      return res.status(400).json({ message: 'Missing required booking fields' });
    }

    // ── REDIS SEAT LOCKING ──────────────────────────────────────────────────
    // Key format: "seat:PNR:COACH:SEAT" e.g. "seat:1234567890:S3:34"
    // This prevents two users from booking the same seat simultaneously
    const seatKey = `seat:${pnr}:${coachNumber || 'NA'}:${seatNumber}`;

    // SET key value NX EX 10
    //   NX = only set if key does NOT exist (atomic lock)
    //   EX 10 = expire after 10 seconds if not released
 const locked = await redis.set(seatKey, req.user!.id, 'EX', 10, 'NX');

    if (!locked) {
      // Someone else has this seat locked right now
      return res.status(409).json({
        message: 'This seat is being booked by someone else. Please try again in a moment.',
      });
    }

    try {
      // ── FIND OR CREATE ROOM ─────────────────────────────────────────────
      // Look for an existing active room with this PNR
      let room = await Room.findOne({ pnr: pnr.toUpperCase(), status: 'active' });

      if (!room) {
        // First person with this PNR — create a new room
        room = new Room({
          pnr: pnr.toUpperCase(),
          journeyType,
          trainNumber,
          flightNumber,
          from,
          to,
          departureTime,
          arrivalTime,
          participants: [req.user!.id],
          messages: [{
            userId: req.user!.id,
            userName: passengerName,
            text: `${passengerName} created this journey room`,
            type: 'system',
          }],
        });
        await room.save();
      } else {
        // Room exists — add this user if not already in it
        if (!room.participants.includes(req.user!.id as any)) {
          room.participants.push(req.user!.id as any);
          room.messages.push({
            userId: req.user!.id as any,
            userName: passengerName,
            text: `${passengerName} joined the journey room`,
            type: 'system',
            timestamp: new Date(),
          });
          await room.save();
        }
      }

      // ── CREATE BOOKING ───────────────────────────────────────────────────
      const booking = new Booking({
        userId: req.user!.id,
        pnr: pnr.toUpperCase(),
        journeyType,
        trainNumber,
        flightNumber,
        from,
        to,
        departureTime,
        arrivalTime,
        coachNumber,
        seatNumber,
        passengerName,
        roomId: room._id,
        status: 'upcoming',
      });
      await booking.save();

      // ── RELEASE LOCK ─────────────────────────────────────────────────────
      // Delete the Redis key — seat is now officially booked
      await redis.del(seatKey);

      res.status(201).json({
        message: 'Booking confirmed!',
        booking,
        roomId: room._id,
      });

    } catch (innerError) {
      // If anything fails after locking, release the lock
      await redis.del(seatKey);
      throw innerError;
    }

  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ message: 'Server error during booking' });
  }
});

// ─── GET MY BOOKINGS ─────────────────────────────────────────────────────────
// GET /api/bookings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await Booking.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .populate('roomId', 'status participants');

    res.json({ bookings });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET ONE BOOKING ──────────────────────────────────────────────────────────
// GET /api/bookings/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      userId: req.user!.id,
    }).populate('roomId');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ booking });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
