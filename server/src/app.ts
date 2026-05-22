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

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/notes', notesRouter);
app.use('/api/graph', graphRouter);
app.use('/api/auth', authRouter);

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

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB Atlas');
      httpServer.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
    });
} else {
  console.log('No MONGODB_URI provided. Starting server without DB connection for now.');
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}
