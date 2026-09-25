/**
 * src/utils/idGuard.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * ONE rule, used everywhere it's needed: never let a raw, unmasked
 * government ID number (Aadhaar = 12 digits, ABHA = 14 digits, generic
 * 10-14 digit ID-shaped numbers) reach the database. Only the masked
 * "91-XXXX-XXXX-1234" style string is ever allowed to be persisted.
 */

'use strict';

// Matches a run of 10-14 consecutive digits (optionally grouped with
// spaces or hyphens, since that's how humans type Aadhaar/ABHA numbers).
const RAW_ID_PATTERN = /\b(?:\d[\s-]?){10,14}\b/;

/**
 * @param {string} value
 * @returns {boolean} true if the string looks like a raw, unmasked ID number
 */
function looksLikeRawId(value) {
  if (typeof value !== 'string') return false;
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 14) return false;
  // A masked ID (e.g. "91-XXXX-XXXX-1234") contains letters (the X's),
  // so it will never match a pure-digit run — that's intentional.
  return RAW_ID_PATTERN.test(value);
}

/**
 * Recursively walks an object/array/string looking for anything that
 * looks like a raw ID number. Returns the dotted path of the first
 * offending field, or null if the payload is clean.
 * @param {*} value
 * @param {string} pathSoFar
 * @param {number} depth guard against pathological/circular input
 * @returns {string|null}
 */
function findRawId(value, pathSoFar = '', depth = 0) {
  if (depth > 8) return null;

  if (typeof value === 'string') {
    return looksLikeRawId(value) ? (pathSoFar || 'value') : null;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findRawId(value[i], `${pathSoFar}[${i}]`, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      // The dedicated raw-ID input fields are allowed to briefly hold a raw
      // number IN TRANSIT — that's the whole point of them — because the
      // controller immediately masks and discards them before anything is
      // saved. Every other field must never contain one.
      if (key === 'abhaId' || key === 'aadhaarNumber' || key === 'rawId') continue;
      const hit = findRawId(value[key], pathSoFar ? `${pathSoFar}.${key}` : key, depth + 1);
      if (hit) return hit;
    }
    return null;
  }

  return null;
}

module.exports = { looksLikeRawId, findRawId };
