/**
 * src/models/Profile.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * The template for a saved patient record. Sensitive fields (name, age,
 * gender, bloodGroup, village, PHC, vitals, allergies, chronicConditions)
 * are NEVER stored as plaintext — they're bundled into one JSON blob and
 * encrypted with AES-256-GCM (src/utils/encryption.js) before the model
 * even reaches Mongoose's save(). abhaIdMasked and patientId stay in the
 * clear because they're needed for lookups and are already non-sensitive
 * (masked / non-identifying on their own).
 *
 * clientRecordId is the offline-sync fingerprint: the device generates
 * it once, before it even knows if it's online, and a unique index here
 * means the exact same record can never be saved twice — even if the
 * flaky connection causes it to be sent three times.
 */

'use strict';

const { Schema, model } = require('mongoose');
const { encryptField, decryptField } = require('../utils/encryption');

const profileSchema = new Schema(
  {
    patientId: { type: String, required: true, index: true },
    clientRecordId: { type: String, required: true, unique: true },
    abhaIdMasked: { type: String, default: null },
    // Encrypted bundle: { ciphertext, iv, authTag }
    encryptedData: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
  },
  { timestamps: true }
);

/**
 * Build a Profile-shaped document from plaintext fields, encrypting the
 * sensitive part. Does NOT save — caller decides upsert vs insert.
 * @param {object} plain includes patientId, clientRecordId, abhaIdMasked,
 *   and the sensitive fields to encrypt (name, age, gender, etc.)
 */
function buildEncryptedDoc(plain) {
  const { patientId, clientRecordId, abhaIdMasked, ...sensitive } = plain;
  return {
    patientId,
    clientRecordId,
    abhaIdMasked: abhaIdMasked || null,
    encryptedData: encryptField(sensitive),
  };
}

/**
 * Decrypt a stored document back into the plaintext shape the frontend
 * expects. Returns null if decryption fails (corrupted / wrong key).
 * @param {object} doc a Mongoose Profile document (or plain object)
 */
function toPlainProfile(doc) {
  if (!doc) return null;
  const sensitive = decryptField(doc.encryptedData);
  if (sensitive === null) return null;
  return {
    patientId: doc.patientId,
    clientRecordId: doc.clientRecordId,
    abhaIdMasked: doc.abhaIdMasked,
    ...sensitive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const Profile = model('Profile', profileSchema);

module.exports = { Profile, buildEncryptedDoc, toPlainProfile };
