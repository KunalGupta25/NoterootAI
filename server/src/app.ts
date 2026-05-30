import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Load environment variables
dotenv.config();

// ── Global crash guards ─────────────────────────────────────────────
// Prevent the process from dying on unhandled errors (Railway marks it
// as crashed and eventually stops restarting after maxRetries).
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception — keeping process alive', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled promise rejection — keeping process alive', reason);
});

const app = express();
const httpServer = createServer(app);

// Allow Vercel frontend + localhost for dev
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'https://noteroot-ai.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsOptions: cors.CorsOptions = {
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

import notesRouter from './routes/notes';
import graphRouter from './routes/graph';
import authRouter from './routes/auth';
import pluginsRouter from './routes/plugins';

// ── CORS Middleware (must be BEFORE routes) ──────────────────────────
// cors() middleware handles preflight OPTIONS automatically (preflightContinue defaults to false)
app.use(cors(corsOptions));

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

// Global error handler — catches any unhandled errors in route handlers
// and prevents Express from crashing the process.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express] Unhandled route error:', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error' });
  }
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
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT} (0.0.0.0)`);
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

  // Auto-reconnect on disconnect
  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected — will auto-reconnect');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err);
  });
} else {
  console.log('No MONGODB_URI provided. Running without DB connection.');
}
