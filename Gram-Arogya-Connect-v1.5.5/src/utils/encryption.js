/**
 * src/utils/encryption.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Encrypts sensitive patient-record fields at rest using AES-256-GCM
 * (authenticated encryption — tampering with the ciphertext is detected,
 * not just hidden). Used by the Profile and AshaSyncRecord models before
 * anything touches MongoDB.
 *
 * Key comes from process.env.ENCRYPTION_KEY, a 64-character hex string
 * (= 32 raw bytes, required for AES-256). Generate one with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * If no key is set, we generate a random one for the current process only
 * and log a loud warning — this keeps local/demo runs working without
 * crashing, but it means encrypted data will NOT be readable after a
 * restart. Real deployments must set ENCRYPTION_KEY explicitly (see
 * SUGGESTIONS.md — ideally pulled from a secrets manager, not .env).
 */

'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended for GCM

function resolveKey() {
  const hexKey = process.env.ENCRYPTION_KEY;

  if (hexKey && /^[0-9a-fA-F]{64}$/.test(hexKey)) {
    return Buffer.from(hexKey, 'hex');
  }

  if (!resolveKey._warned) {
    console.warn(
      '[encryption] ENCRYPTION_KEY missing or not a 64-char hex string — ' +
      'using a random in-memory key for this process only. Set ENCRYPTION_KEY ' +
      'in .env for real deployments, or encrypted data will be unreadable after a restart.'
    );
    resolveKey._warned = true;
  }

  if (!resolveKey._fallbackKey) {
    resolveKey._fallbackKey = crypto.randomBytes(32);
  }
  return resolveKey._fallbackKey;
}

/**
 * Encrypt a JS value (object/string/number/etc). Returns the three pieces
 * needed to decrypt later: ciphertext, iv, and the GCM auth tag — all hex.
 * @param {*} plainValue
 * @returns {{ ciphertext: string, iv: string, authTag: string }}
 */
function encryptField(plainValue) {
  const key = resolveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(plainValue ?? null);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Reverse of encryptField. Returns the original JS value, or null if
 * any piece is missing/corrupt (never throws into a controller — callers
 * should treat a null return as "record unreadable").
 * @param {{ ciphertext: string, iv: string, authTag: string }} payload
 */
function decryptField(payload) {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.authTag) {
    return null;
  }

  try {
    const key = resolveKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('[encryption] Failed to decrypt a record (bad key or corrupted data):', error.message);
    return null;
  }
}

module.exports = { encryptField, decryptField };
