/**
 * src/validators/syncValidator.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Same idea as profileBatchValidator.js, but for ASHA workers' offline
 * visit logs (POST /api/v1/sync/asha).
 */

'use strict';

const { findRawId } = require('../utils/idGuard');

function isValidVisitRecordShape(record) {
  return (
    record &&
    typeof record === 'object' &&
    !Array.isArray(record) &&
    typeof record.patientName === 'string' &&
    record.patientName.trim().length > 0 &&
    typeof record.visitDate === 'string'
  );
}

function validateSyncBatch(req, res, next) {
  const { deviceId, records } = req.body || {};

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ success: false, message: "Missing or invalid 'deviceId' field.", data: null });
  }

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: "'records' must be a non-empty array of visit records.", data: null });
  }

  if (records.length > 1000) {
    return res.status(400).json({ success: false, message: 'Batch too large — split into batches of 1000 or fewer.', data: null });
  }

  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    if (!isValidVisitRecordShape(record)) continue; // shape errors are reported per-record by the controller, not fatal for the batch
    const offendingPath = findRawId(record);
    if (offendingPath) {
      return res.status(400).json({ success: false, message: `records[${i}].${offendingPath} looks like a raw, unmasked ID number.`, data: null });
    }
  }

  next();
}

module.exports = { validateSyncBatch, isValidVisitRecordShape };
