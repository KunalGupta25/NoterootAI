import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import crypto from 'crypto';
import { Server } from 'socket.io';
import { config, corsOptions } from './config';
import { connectMongo } from './database';

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

const io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigins,
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

app.use((req, res, next) => {
  const requestId = req.header('X-Request-Id') || crypto.randomUUID();
  res.setHeader('X-Request-Id', requestId);
  next();
});

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
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Express] Unhandled route error', {
    requestId: res.getHeader('X-Request-Id'),
    method: req.method,
    path: req.path,
    error: err,
  });
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
// Always start listening right away (Railway requires the port to be bound quickly)
httpServer.listen(config.port, '0.0.0.0', () => {
  console.log(`Server is running on port ${config.port} (0.0.0.0)`);
});

connectMongo(config.mongodbUri);
