import 'dotenv/config'; // Load .env file FIRST, before anything else
import http from 'http';
import app from './app';
import connectDB from './config/db';

const PORT = process.env.PORT || 5000;

// Create an HTTP server wrapping our Express app
// We need this separate step later when we add Socket.IO
const server = http.createServer(app);

// Start everything
const startServer = async () => {
  // Step 1: Connect to MongoDB
  await connectDB();

  // Step 2: Start listening for requests
  server.listen(PORT, () => {
    console.log(`Voyago server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
};

startServer();