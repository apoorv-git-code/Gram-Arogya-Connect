/**
 * src/validators/profileValidator.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Bouncer for a single patient profile submission (POST /api/v1/profile).
 * Runs BEFORE the controller — bad data gets rejected here with a clear
 * reason, so it never reaches the database layer.
 */

'use strict';

const { findRawId } = require('../utils/idGuard');

const ALLOWED_GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateProfile(req, res, next) {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: 'Invalid request body. Expected a profile object.', data: null });
  }

  if (body.name !== undefined && !isNonEmptyString(body.name)) {
    return res.status(400).json({ success: false, message: '"name" must be a non-empty string.', data: null });
  }

  if (body.age !== undefined && (typeof body.age !== 'number' || body.age < 0 || body.age > 120)) {
    return res.status(400).json({ success: false, message: '"age" must be a number between 0 and 120.', data: null });
  }

  if (body.gender !== undefined && !ALLOWED_GENDERS.includes(body.gender)) {
    return res.status(400).json({ success: false, message: `"gender" must be one of: ${ALLOWED_GENDERS.join(', ')}.`, data: null });
  }

  if (body.vitals !== undefined) {
    if (typeof body.vitals !== 'object' || Array.isArray(body.vitals)) {
      return res.status(400).json({ success: false, message: '"vitals" must be an object.', data: null });
    }
    const { heightCm, weightKg, bpSystolic, bpDiastolic, pulseBpm, spo2Percent } = body.vitals;
    const numericChecks = [
      [heightCm, 30, 250, 'heightCm'],
      [weightKg, 1, 300, 'weightKg'],
      [bpSystolic, 40, 260, 'bpSystolic'],
      [bpDiastolic, 20, 180, 'bpDiastolic'],
      [pulseBpm, 20, 250, 'pulseBpm'],
      [spo2Percent, 0, 100, 'spo2Percent'],
    ];
    for (const [value, min, max, label] of numericChecks) {
      if (value !== undefined && (typeof value !== 'number' || value < min || value > max)) {
        return res.status(400).json({ success: false, message: `"vitals.${label}" must be a number between ${min} and ${max}.`, data: null });
      }
    }
  }

  // Never allow a raw, unmasked government ID number to slip in through
  // any field other than the dedicated abhaId input.
  const offendingPath = findRawId(body);
  if (offendingPath) {
    return res.status(400).json({
      success: false,
      message: `Field "${offendingPath}" looks like a raw, unmasked ID number. Only masked IDs are accepted.`,
      data: null,
    });
  }

  next();
}

module.exports = { validateProfile };
