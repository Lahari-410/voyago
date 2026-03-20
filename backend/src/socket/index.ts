import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Room from '../models/Room';
import CabSplit from '../models/CabSplit';

// Socket.IO is what makes the chat "live"
// Normal HTTP: browser asks server answers (one direction at a time)
// Socket.IO:   browser and server can send messages ANY time (like a phone call)

interface AuthSocket extends Socket {
  user?: { id: string; name: string; email: string };
}

const setupSocket = (io: SocketIOServer) => {

  // ── AUTH MIDDLEWARE FOR SOCKETS ──────────────────────────────────────────
  // Every socket connection must send a valid JWT token
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id: string; name: string; email: string;
      };
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthSocket) => {
    console.log(`🔌 Connected: ${socket.user?.name}`);

    // ── JOIN ROOM ─────────────────────────────────────────────────────────
    // User opens the live room page — they join the socket channel
    socket.on('join_room', async (roomId: string) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) { socket.emit('error', { message: 'Room not found' }); return; }

        socket.join(roomId);

        // Tell everyone else this user joined
        socket.to(roomId).emit('user_joined', {
          userId: socket.user?.id,
          userName: socket.user?.name,
          timestamp: new Date(),
        });

        // Send last 50 messages to the newly joined user
        socket.emit('room_history', { messages: room.messages.slice(-50) });

      } catch { socket.emit('error', { message: 'Could not join room' }); }
    });

    // ── SEND MESSAGE ──────────────────────────────────────────────────────
    socket.on('send_message', async (data: { roomId: string; text: string }) => {
      try {
        const { roomId, text } = data;
        if (!text?.trim()) return;

        const message = {
          userId: socket.user!.id as any,
          userName: socket.user!.name,
          text: text.trim(),
          type: 'text' as const,
          timestamp: new Date(),
        };

        // Save to MongoDB (persists across refreshes)
        await Room.findByIdAndUpdate(roomId, { $push: { messages: message } });

        // Broadcast to ALL users in this room instantly
        io.to(roomId).emit('new_message', message);

      } catch { socket.emit('error', { message: 'Could not send message' }); }
    });

    // ── REPORT ISSUE ──────────────────────────────────────────────────────
    socket.on('report_issue', async (data: { roomId: string; issue: string }) => {
      try {
        const { roomId, issue } = data;
        const message = {
          userId: socket.user!.id as any,
          userName: socket.user!.name,
          text: `🚨 Issue reported: ${issue}`,
          type: 'issue' as const,
          timestamp: new Date(),
        };

        await Room.findByIdAndUpdate(roomId, {
          $push: { messages: message, issues: issue },
        });

        io.to(roomId).emit('new_message', message);
        io.to(roomId).emit('issue_reported', { issue, reportedBy: socket.user?.name });

      } catch { socket.emit('error', { message: 'Could not report issue' }); }
    });

    // ── CAB PAYMENT UPDATE ────────────────────────────────────────────────
    // When someone pays their cab share, broadcast live to the room
    socket.on('cab_payment_update', async (data: { roomId: string; cabSplitId: string }) => {
      try {
        const cabSplit = await CabSplit.findById(data.cabSplitId);
        if (!cabSplit) return;
        io.to(data.roomId).emit('cab_split_updated', { cabSplit });
      } catch { socket.emit('error', { message: 'Could not update cab split' }); }
    });

    // ── TYPING INDICATORS ─────────────────────────────────────────────────
    socket.on('typing', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user_typing', {
        userId: socket.user?.id,
        userName: socket.user?.name,
      });
    });

    socket.on('stop_typing', (data: { roomId: string }) => {
      socket.to(data.roomId).emit('user_stop_typing', { userId: socket.user?.id });
    });

    // ── LEAVE ROOM ────────────────────────────────────────────────────────
    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
      socket.to(roomId).emit('user_left', {
        userId: socket.user?.id,
        userName: socket.user?.name,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${socket.user?.name}`);
    });
  });

  // ── AUTO-CLOSE ROOMS AFTER ARRIVAL ───────────────────────────────────────
  // Every 60 seconds, close rooms where arrivalTime has passed
  setInterval(async () => {
    try {
      const expired = await Room.find({
        status: 'active',
        arrivalTime: { $lt: new Date() },
      });

      for (const room of expired) {
        room.status = 'closed';
        await room.save();
        io.to(room._id.toString()).emit('room_closed', {
          message: 'Journey complete! This room has been closed.',
          roomId: room._id,
        });
        console.log(`🚉 Room closed: ${room.pnr}`);
      }
    } catch (err) {
      console.error('Auto-close error:', err);
    }
  }, 60 * 1000);
};

export default setupSocket;
