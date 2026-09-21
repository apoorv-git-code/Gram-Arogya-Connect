'use strict';

require('dotenv').config();

const http = require('http');
const https = require('https');
const path = require('path');
const cors = require('cors');
const express = require('express');
const { Server } = require('socket.io');

const { connectDb } = require('./config/db');
const { loadHttpsOptions } = require('./config/https');
const { helmetMiddleware, sanitize, apiLimiter } = require('./middleware/security');
const { notFound, globalErrorHandler } = require('./middleware/errorHandler');
const offlineQueue = require('./utils/offlineQueue');

const apiRoutes = require('./routes/api');
const queueController = require('./controllers/queueController');

const app = express();
const publicDir = path.join(__dirname, '..', 'public');
const clientOrigin = process.env.CLIENT_ORIGIN || '*';
const staticMaxAge = process.env.NODE_ENV === 'production' ? '1h' : 0;

// --- HTTP(S) server: use real HTTPS if a cert/key is configured, else plain HTTP ---
const httpsOptions = loadHttpsOptions();
const server = httpsOptions ? https.createServer(httpsOptions, app) : http.createServer(app);

const io = new Server(server, {
  cors: { origin: clientOrigin, methods: ['GET', 'POST'] },
});

app.set('io', io);
app.disable('x-powered-by');

// --- Security layers, in order: helmet -> cors -> body parsing -> sanitize -> rate limit ---
app.use(helmetMiddleware);
app.use(cors({ origin: clientOrigin }));
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);
app.use('/api', apiLimiter);

app.use(express.static(publicDir, { extensions: ['html'], maxAge: staticMaxAge, etag: true }));
app.use('/api/v1', apiRoutes);

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(publicDir, 'index.html'));
});

// --- Catch-all: unmatched routes, then any error thrown anywhere above ---
app.use(notFound);
app.use(globalErrorHandler);

io.on('connection', socket => {
  socket.emit('queue:update', queueController.getSnapshot());
  console.log(`[socket] connected: ${socket.id}`);
  socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`));
});

// Queue data is database-backed; no demo timer mutates it.

// --- Database + offline auto-sync queue ---
connectDb();
offlineQueue.startAutoDrain();

const port = Number(process.env.PORT) || 4000;
server.listen(port, () => {
  const protocol = httpsOptions ? 'https' : 'http';
  console.log(`Gram Arogya Connect is ready at ${protocol}://localhost:${port}`);
});

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the other server or run: PORT=4001 npm start`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

// --- Process-level safety net: log and keep running instead of crashing silently ---
process.on('unhandledRejection', reason => {
  console.error('[process] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', error => {
  console.error('[process] Uncaught exception:', error);
});

function shutdown() {
  offlineQueue.stopAutoDrain();
  io.close();
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
