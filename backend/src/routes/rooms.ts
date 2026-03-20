import { Router, Response } from 'express';
import authMiddleware, { AuthRequest } from '../middleware/auth';
import Room from '../models/Room';
import CabSplit from '../models/CabSplit';

const router = Router();
router.use(authMiddleware);

// ─── GET ROOM ────────────────────────────────────────────────────────────────
// GET /api/rooms/:id
// Returns room details including all messages and participants
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const room = await Room.findById(req.params.id)
      .populate('participants', 'name email phone');

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Only participants can view the room
    const isParticipant = room.participants.some(
      (p: any) => p._id.toString() === req.user!.id
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'You are not in this room' });
    }

    res.json({ room });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── REPORT ISSUE ────────────────────────────────────────────────────────────
// POST /api/rooms/:id/issues
// Passengers can report problems (dirty coach, AC not working, etc.)
router.post('/:id/issues', async (req: AuthRequest, res: Response) => {
  try {
    const { issue } = req.body;

    if (!issue) {
      return res.status(400).json({ message: 'Issue description is required' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Add issue to the list
    room.issues.push(issue);

    // Also add as a system message so everyone in the room can see it
    room.messages.push({
      userId: req.user!.id as any,
      userName: req.user!.name,
      text: `🚨 Issue reported: ${issue}`,
      type: 'issue',
      timestamp: new Date(),
    });

    await room.save();
    res.json({ message: 'Issue reported', issues: room.issues });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── CREATE CAB SPLIT ────────────────────────────────────────────────────────
// POST /api/rooms/:id/cab-split
// One passenger creates a cab split, specifying the total amount and co-passengers
router.post('/:id/cab-split', async (req: AuthRequest, res: Response) => {
  try {
    const { totalAmount, destination, participantIds } = req.body;

    if (!totalAmount || !destination || !participantIds?.length) {
      return res.status(400).json({ message: 'Missing cab split details' });
    }

    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });

    // Split the fare equally among all participants
    const sharePerPerson = Math.ceil(totalAmount / (participantIds.length + 1));

    // Build participants list (everyone except the creator pays their share)
    const participants = participantIds.map((id: string) => ({
      userId: id,
      userName: 'Passenger',  // will be updated from User model in real flow
      share: sharePerPerson,
      paid: false,
    }));

    const cabSplit = new CabSplit({
      roomId: req.params.id,
      createdBy: req.user!.id,
      totalAmount,
      destination,
      participants,
    });

    await cabSplit.save();
    res.status(201).json({ message: 'Cab split created', cabSplit });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── GET CAB SPLITS FOR ROOM ─────────────────────────────────────────────────
// GET /api/rooms/:id/cab-splits
router.get('/:id/cab-splits', async (req: AuthRequest, res: Response) => {
  try {
    const cabSplits = await CabSplit.find({ roomId: req.params.id })
      .sort({ createdAt: -1 });
    res.json({ cabSplits });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
