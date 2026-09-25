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

// -------------------------------------------------------
// TRUST RENDER'S REVERSE PROXY
// -------------------------------------------------------
// Render places your Express application behind a proxy.
// This allows Express and express-rate-limit to correctly
// determine the real client IP from X-Forwarded-For.
//
// Using 1 means trust the first proxy in front of Express.
// -------------------------------------------------------
app.set('trust proxy', 1);

const publicDir = path.join(__dirname, '..', 'public');
const clientOrigin = process.env.CLIENT_ORIGIN || '*';
const staticMaxAge = process.env.NODE_ENV === 'production' ? '1h' : 0;

// -------------------------------------------------------
// HTTP / HTTPS SERVER
// -------------------------------------------------------
// Use real HTTPS if a certificate/key is configured.
// Otherwise use HTTP (normal when deployed on Render,
// because Render terminates HTTPS at its proxy).
// -------------------------------------------------------

const httpsOptions = loadHttpsOptions();

const server = httpsOptions
  ? https.createServer(httpsOptions, app)
  : http.createServer(app);

// -------------------------------------------------------
// SOCKET.IO
// -------------------------------------------------------

const io = new Server(server, {
  cors: {
    origin: clientOrigin,
    methods: ['GET', 'POST']
  }
});

app.set('io', io);

// Don't expose Express in response headers.
app.disable('x-powered-by');

// -------------------------------------------------------
// SECURITY / REQUEST MIDDLEWARE
// -------------------------------------------------------
//
// Order:
// helmet
// -> cors
// -> JSON parsing
// -> sanitization
// -> rate limiting
//
// -------------------------------------------------------

app.use(helmetMiddleware);

app.use(
  cors({
    origin: clientOrigin
  })
);

app.use(
  express.json({
    limit: '1mb'
  })
);

app.use(sanitize);

// express-rate-limit can now correctly identify users
// because trust proxy was configured above.
app.use('/api', apiLimiter);

// -------------------------------------------------------
// STATIC FRONTEND
// -------------------------------------------------------

app.use(
  express.static(publicDir, {
    extensions: ['html'],
    maxAge: staticMaxAge,
    etag: true
  })
);

// -------------------------------------------------------
// API ROUTES
// -------------------------------------------------------

app.use('/api/v1', apiRoutes);

// -------------------------------------------------------
// SPA FALLBACK
// -------------------------------------------------------
//
// Requests that aren't API requests are served index.html.
// This allows client-side navigation/routes to work.
//
// -------------------------------------------------------

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  return res.sendFile(
    path.join(publicDir, 'index.html')
  );
});

// -------------------------------------------------------
// ERROR HANDLING
// -------------------------------------------------------

app.use(notFound);
app.use(globalErrorHandler);

// -------------------------------------------------------
// SOCKET CONNECTIONS
// -------------------------------------------------------

io.on('connection', socket => {
  socket.emit(
    'queue:update',
    queueController.getSnapshot()
  );

  console.log(
    `[socket] connected: ${socket.id}`
  );

  socket.on('disconnect', () => {
    console.log(
      `[socket] disconnected: ${socket.id}`
    );
  });
});

// Queue data is database-backed.
// No demo timer mutates it.

// -------------------------------------------------------
// DATABASE + OFFLINE AUTO-SYNC
// -------------------------------------------------------

connectDb();

offlineQueue.startAutoDrain();

// -------------------------------------------------------
// START SERVER
// -------------------------------------------------------

const port = Number(process.env.PORT) || 4000;

server.listen(port, () => {
  const protocol = httpsOptions
    ? 'https'
    : 'http';

  console.log(
    `Gram Arogya Connect is ready at ${protocol}://localhost:${port}`
  );
});

// -------------------------------------------------------
// SERVER ERROR HANDLING
// -------------------------------------------------------

server.on('error', error => {

  if (error.code === 'EADDRINUSE') {
    console.error(
      `Port ${port} is already in use. ` +
      `Stop the other server or run: PORT=4001 npm start`
    );

    process.exitCode = 1;
    return;
  }

  throw error;
});

// -------------------------------------------------------
// PROCESS-LEVEL SAFETY NET
// -------------------------------------------------------

process.on('unhandledRejection', reason => {
  console.error(
    '[process] Unhandled promise rejection:',
    reason
  );
});

process.on('uncaughtException', error => {
  console.error(
    '[process] Uncaught exception:',
    error
  );
});

// -------------------------------------------------------
// GRACEFUL SHUTDOWN
// -------------------------------------------------------

function shutdown() {

  offlineQueue.stopAutoDrain();

  io.close();

  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
