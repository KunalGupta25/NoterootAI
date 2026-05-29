import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // For dev, allow all
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

import notesRouter from './routes/notes';
import graphRouter from './routes/graph';
import authRouter from './routes/auth';
import pluginsRouter from './routes/plugins';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/auth', authRouter);
app.use('/api/plugins', pluginsRouter);

// Basic Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NoteRoot API is running' });
});

// Socket.io for Real-time
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

import './neo4j'; // Initialize Neo4j driver

// Database Connection — start server immediately so Railway health check passes
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

// Always start listening right away (Railway requires the port to be bound quickly)
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Connect to MongoDB in the background (non-fatal if it fails)
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB Atlas');
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
    });
} else {
  console.log('No MONGODB_URI provided. Running without DB connection.');
}
