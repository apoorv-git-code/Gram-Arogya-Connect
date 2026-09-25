/**
 * src/controllers/syncController.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Handles bulk synchronization of offline-collected visit records from
 * ASHA (Accredited Social Health Activist) workers operating in
 * zero-network / low-connectivity rural zones. Records are queued locally
 * on the ASHA worker's device and pushed in a single batch once
 * connectivity is restored — and if the SERVER's own DB link is down when
 * that batch arrives, they go into src/utils/offlineQueue.js and
 * auto-sync later, so nothing is lost either way.
 *
 * Wired via src/routes/api.js:
 *   POST /api/v1/sync/asha -> syncAshaRecords
 *   GET  /api/v1/sync/asha -> getSyncHistory
 */

'use strict';

const crypto = require('crypto');
const { isDbConnected } = require('../config/db');
const { AshaSyncRecord, buildEncryptedDoc, toPlainRecord } = require('../models/AshaSyncRecord');
const { isValidVisitRecordShape } = require('../validators/syncValidator');
const offlineQueue = require('../utils/offlineQueue');

// Mock fallback log, only used before the DB has ever been reachable.
const mockSyncLog = [];
const mockSyncBatches = [];

// Encryption happens BEFORE anything reaches the offline queue file on
// disk, same as authController.js — the queue never holds plaintext.
async function saveEncryptedDoc(doc) {
  await AshaSyncRecord.updateOne(
    { clientRecordId: doc.clientRecordId },
    { $setOnInsert: doc },
    { upsert: true }
  );
}
offlineQueue.registerSaver('ashaSyncRecord', saveEncryptedDoc);

async function persistAshaRecord(record) {
  const doc = buildEncryptedDoc(record);
  await saveEncryptedDoc(doc);
}

/**
 * A device SHOULD always send its own clientRecordId (generated at the
 * moment the record was created offline). This is only a fallback for
 * older clients that don't yet — it must never contain the patient's
 * name or any other identifying data in the clear, so we hash it.
 */
function fallbackClientRecordId(deviceId, record) {
  const hash = crypto
    .createHash('sha256')
    .update(`${deviceId}|${record.patientName}|${record.visitDate}`)
    .digest('hex')
    .slice(0, 24);
  return `SYNCFP-${hash}`;
}

/**
 * POST /api/v1/sync/asha
 * Body already passed through validators/syncValidator.js (idGuard + shape sanity).
 * Expects: { deviceId, records: [...] } in req.body
 */
async function syncAshaRecords(req, res, next) {
  try {
    const { deviceId, records } = req.body;

    const validRecords = [];
    const rejectedRecords = [];

    records.forEach((record, index) => {
      if (isValidVisitRecordShape(record)) {
        validRecords.push({
          ...record,
          clientRecordId: record.clientRecordId || fallbackClientRecordId(deviceId, record),
          syncId: `SYNC-${Date.now()}-${index}`,
          receivedAt: new Date().toISOString(),
          deviceId,
        });
      } else {
        rejectedRecords.push({ index, reason: 'Missing required fields (patientName, visitDate).' });
      }
    });

    let synced = 0;
    let queued = 0;

    for (const record of validRecords) {
      if (isDbConnected()) {
        try {
          await persistAshaRecord(record);
          synced += 1;
          continue;
        } catch (dbError) {
          // fall through to queue below
        }
      }
      offlineQueue.enqueue('ashaSyncRecord', buildEncryptedDoc(record));
      queued += 1;
    }

    mockSyncLog.push(...validRecords);
    const batchSummary = {
      batchId: `BATCH-${Date.now()}`,
      deviceId,
      syncTimestamp: new Date().toISOString(),
      recordsReceived: records.length,
      recordsSyncedNow: synced,
      recordsQueued: queued,
      recordsRejected: rejectedRecords.length,
    };
    mockSyncBatches.push(batchSummary);

    return res.status(200).json({
      success: true,
      message: `Batch sync completed. ${synced} synced immediately, ${queued} queued for auto-sync, ${rejectedRecords.length} rejected.`,
      data: { ...batchSummary, rejectedDetails: rejectedRecords },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/v1/sync/asha
 * Returns a history of past batch syncs (most recent first), optionally
 * filtered by deviceId via ?deviceId=... query param.
 */
async function getSyncHistory(req, res, next) {
  try {
    const { deviceId } = req.query;

    if (isDbConnected()) {
      const query = deviceId ? { deviceId } : {};
      const docs = await AshaSyncRecord.find(query).sort({ createdAt: -1 }).limit(200).lean();
      const records = docs.map(toPlainRecord).filter(Boolean);
      return res.status(200).json({
        success: true,
        message: 'Sync history retrieved successfully.',
        data: {
          totalRecordsSynced: records.length,
          recordsPendingInOfflineQueue: offlineQueue.queueLength(),
          records,
        },
      });
    }

    let history = [...mockSyncBatches].reverse();
    if (deviceId) history = history.filter(batch => batch.deviceId === deviceId);

    return res.status(200).json({
      success: true,
      message: 'Sync history retrieved successfully (offline mode).',
      data: {
        totalBatches: history.length,
        totalRecordsSynced: mockSyncLog.length,
        recordsPendingInOfflineQueue: offlineQueue.queueLength(),
        batches: history,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  syncAshaRecords,
  getSyncHistory,
};
