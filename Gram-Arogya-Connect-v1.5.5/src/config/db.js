/**
 * src/config/db.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Connects the app to MongoDB using Mongoose.
 *
 * IMPORTANT DESIGN RULE: this app must never crash just because the
 * database is unreachable (villages have bad internet, and the server
 * itself may be running on a patchy connection to a cloud DB). So:
 *   - connection is attempted in the background, with a short timeout
 *   - on failure, we log a warning and let the app keep running
 *   - controllers check `isDbConnected()` and fall back to the
 *     in-memory mock data / offline queue when the DB isn't available
 *   - we keep retrying quietly in the background via Mongoose's own
 *     reconnection logic, and the offline queue (src/utils/offlineQueue.js)
 *     auto-drains into the DB the moment we reconnect.
 */

'use strict';

const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/gram_arogya_connect_v15';

function getMongoUri() {
  return process.env.MONGODB_URI || DEFAULT_URI;
}

/**
 * True whenever Mongoose currently has a live connection (readyState 1).
 * Controllers should check this before doing a DB read/write and fall
 * back to mock/offline behaviour when it's false.
 */
function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

async function connectDb() {
  const uri = getMongoUri();

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected.');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected — falling back to offline queue / in-memory data until it reconnects.');
  });

  mongoose.connection.on('error', error => {
    console.error('[db] MongoDB connection error:', error.message);
  });

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000, // fail fast instead of hanging the boot process
    });
  } catch (error) {
    console.warn(
      `[db] Could not connect to MongoDB at startup (${error.message}). ` +
      'Server will keep running on in-memory/offline-queue mode and retry in the background.'
    );
  }
}

module.exports = {
  connectDb,
  isDbConnected,
  mongoose,
};
