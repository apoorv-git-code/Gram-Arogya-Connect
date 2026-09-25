/**
 * src/validators/sosValidator.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Two jobs:
 *   1. Basic shape checks on an SOS trigger (patientName, location).
 *   2. A cooldown timer — stops the same patient/device from triggering
 *      the emergency ambulance dispatch twice within 10 seconds by
 *      accident (a shaky finger double-tapping the SOS button on a
 *      cheap phone is the realistic failure mode here, not malice).
 */

'use strict';

const COOLDOWN_MS = 10 * 1000;
const lastDispatchByKey = new Map(); // key -> timestamp (ms)

function cooldownKey(req) {
  const name = (req.body && req.body.patientName) || 'unknown';
  return `${req.ip}::${name}`;
}

function validateSos(req, res, next) {
  const { patientName, location } = req.body || {};

  if (!patientName || typeof patientName !== 'string') {
    return res.status(400).json({ success: false, message: "Missing or invalid 'patientName' field.", data: null });
  }

  if (!location || typeof location !== 'object' || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
    return res.status(400).json({
      success: false,
      message: "Missing or invalid 'location' field. Expected { lat: number, lng: number, address?: string }.",
      data: null,
    });
  }

  if (location.lat < -90 || location.lat > 90 || location.lng < -180 || location.lng > 180) {
    return res.status(400).json({ success: false, message: 'location.lat/lng are out of valid range.', data: null });
  }

  const key = cooldownKey(req);
  const now = Date.now();
  const lastAt = lastDispatchByKey.get(key);

  if (lastAt && now - lastAt < COOLDOWN_MS) {
    return res.status(429).json({
      success: false,
      message: 'An emergency dispatch was already triggered moments ago for this patient. Help is on the way.',
      data: null,
    });
  }

  lastDispatchByKey.set(key, now);
  next();
}

module.exports = { validateSos };
