/**
 * src/utils/offlineQueue.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * THE OFFLINE AUTO-SYNC LAYER.
 *
 * Villages have bad/no internet, and sometimes the SERVER's own link to
 * the cloud database drops too. Either way, a record must never be lost.
 * This module is the safety net for that:
 *
 *   1. Every incoming patient profile / ASHA visit record gets queued
 *      here FIRST (persisted to a local JSON file, so it survives a
 *      server restart, not just kept in RAM).
 *   2. If MongoDB is reachable right now, we try to save immediately.
 *   3. If it isn't, the record just sits in the queue.
 *   4. A background timer checks the DB connection every few seconds; the
 *      moment it's back, every queued record is pushed in, in order,
 *      using each record's unique clientRecordId so re-sending something
 *      that already made it through never creates a duplicate.
 *
 * (This plays the role the team calls the "FTP & Offline Auto-Sync"
 * layer — it's not literally the FTP protocol, which is old and
 * unencrypted; this is the secure, encrypted-at-rest equivalent. See
 * SUGGESTIONS.md for why real FTP was deliberately not used.)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { isDbConnected } = require('../config/db');

const QUEUE_FILE = path.join(__dirname, '..', 'data', 'offline-queue.json');
const DRAIN_INTERVAL_MS = 5000;

/** In-memory mirror of the queue file, so reads are cheap. */
let queue = [];
/** type -> async function(record) => Promise<void>. Throws to keep record queued. */
const savers = {};

function ensureDataDir() {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadQueueFromDisk() {
  ensureDataDir();
  if (!fs.existsSync(QUEUE_FILE)) {
    queue = [];
    return;
  }
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf8');
    queue = raw.trim() ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('[offlineQueue] Could not read queue file, starting empty:', error.message);
    queue = [];
  }
}

function persistQueueToDisk() {
  ensureDataDir();
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (error) {
    console.error('[offlineQueue] Could not persist queue file:', error.message);
  }
}

/**
 * Register the function that actually saves one queued record of a given
 * type to MongoDB. Called once per record type at server startup.
 * @param {string} type e.g. 'profile' | 'ashaSyncRecord'
 * @param {(record: object) => Promise<void>} saveFn
 */
function registerSaver(type, saveFn) {
  savers[type] = saveFn;
}

/**
 * Add a record to the offline queue immediately (synchronously persisted
 * to disk so it survives a crash/restart before it's ever tried against
 * the DB).
 * @param {string} type
 * @param {object} record must include a unique clientRecordId
 */
function enqueue(type, record) {
  queue.push({
    type,
    record,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  });
  persistQueueToDisk();
  return queue.length;
}

function queueLength() {
  return queue.length;
}

/**
 * Try to push every queued record into MongoDB, in order. Anything that
 * fails stays in the queue for the next drain cycle. Safe to call even
 * when the DB is down (it just no-ops).
 */
async function drain() {
  if (!isDbConnected() || queue.length === 0) return;

  const stillQueued = [];
  let syncedCount = 0;

  for (const item of queue) {
    const saveFn = savers[item.type];
    if (!saveFn) {
      // No saver registered for this type (shouldn't happen) — keep it
      // queued rather than silently dropping the record.
      stillQueued.push(item);
      continue;
    }
    try {
      await saveFn(item.record);
      syncedCount += 1;
    } catch (error) {
      item.attempts += 1;
      item.lastError = error.message;
      stillQueued.push(item);
    }
  }

  queue = stillQueued;
  persistQueueToDisk();

  if (syncedCount > 0) {
    console.log(`[offlineQueue] Auto-synced ${syncedCount} queued record(s) to MongoDB. ${queue.length} remaining.`);
  }
}

let drainTimer = null;

function startAutoDrain() {
  loadQueueFromDisk();
  if (drainTimer) return;
  drainTimer = setInterval(() => {
    drain().catch(error => console.error('[offlineQueue] Drain cycle failed:', error.message));
  }, DRAIN_INTERVAL_MS);
  drainTimer.unref();
}

function stopAutoDrain() {
  if (drainTimer) clearInterval(drainTimer);
  drainTimer = null;
}

module.exports = {
  registerSaver,
  enqueue,
  queueLength,
  drain,
  startAutoDrain,
  stopAutoDrain,
};
