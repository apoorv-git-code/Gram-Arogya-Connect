/**
 * src/validators/profileBatchValidator.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Same shape checks as profileValidator.js, but for a whole LIST of
 * profiles at once — used when a phone comes back online and needs to
 * flush every profile it saved while offline, in one batch
 * (POST /api/v1/profile/batch).
 */

'use strict';

const { findRawId } = require('../utils/idGuard');

function validateProfileBatch(req, res, next) {
  const { deviceId, profiles } = req.body || {};

  if (!deviceId || typeof deviceId !== 'string') {
    return res.status(400).json({ success: false, message: "Missing or invalid 'deviceId' field.", data: null });
  }

  if (!Array.isArray(profiles) || profiles.length === 0) {
    return res.status(400).json({ success: false, message: "'profiles' must be a non-empty array.", data: null });
  }

  if (profiles.length > 500) {
    return res.status(400).json({ success: false, message: 'Batch too large — split into batches of 500 or fewer.', data: null });
  }

  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
      return res.status(400).json({ success: false, message: `profiles[${i}] must be an object.`, data: null });
    }
    if (!profile.clientRecordId || typeof profile.clientRecordId !== 'string') {
      return res.status(400).json({ success: false, message: `profiles[${i}] is missing a "clientRecordId" (required for offline dedupe).`, data: null });
    }
    const offendingPath = findRawId(profile);
    if (offendingPath) {
      return res.status(400).json({ success: false, message: `profiles[${i}].${offendingPath} looks like a raw, unmasked ID number.`, data: null });
    }
  }

  next();
}

module.exports = { validateProfileBatch };
