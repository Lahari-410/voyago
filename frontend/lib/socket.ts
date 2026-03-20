import { io, Socket } from 'socket.io-client';
import { getToken } from './api';

// This file manages the WebSocket connection to the backend
// Socket.IO enables real-time: messages arrive instantly without refreshing

let socket: Socket | null = null;

// getSocket() — returns existing socket or creates a new one
// Call this from any component that needs real-time features
export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      // Send the JWT token when connecting — backend verifies it
      auth: { token: getToken() },
      // Automatically try to reconnect if connection drops
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  return socket;
};

// disconnectSocket() — call when user logs out
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
