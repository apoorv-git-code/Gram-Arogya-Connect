/**
 * src/models/AshaSyncRecord.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Same idea as Profile.js, but for ASHA worker visit logs collected
 * offline in the field. clientRecordId (generated on-device, before the
 * worker's phone even knows if it has signal) is the unique fingerprint
 * that stops the same visit being saved twice when a batch gets re-sent
 * after a dropped connection.
 */

'use strict';

const { Schema, model } = require('mongoose');
const { encryptField, decryptField } = require('../utils/encryption');

const ashaSyncRecordSchema = new Schema(
  {
    clientRecordId: { type: String, required: true, unique: true },
    deviceId: { type: String, required: true, index: true },
    syncId: { type: String, required: true },
    receivedAt: { type: String, required: true },
    encryptedData: {
      ciphertext: { type: String, required: true },
      iv: { type: String, required: true },
      authTag: { type: String, required: true },
    },
  },
  { timestamps: true }
);

function buildEncryptedDoc(plain) {
  const { clientRecordId, deviceId, syncId, receivedAt, ...sensitive } = plain;
  return {
    clientRecordId,
    deviceId,
    syncId,
    receivedAt,
    encryptedData: encryptField(sensitive),
  };
}

function toPlainRecord(doc) {
  if (!doc) return null;
  const sensitive = decryptField(doc.encryptedData);
  if (sensitive === null) return null;
  return {
    clientRecordId: doc.clientRecordId,
    deviceId: doc.deviceId,
    syncId: doc.syncId,
    receivedAt: doc.receivedAt,
    ...sensitive,
  };
}

const AshaSyncRecord = model('AshaSyncRecord', ashaSyncRecordSchema);

module.exports = { AshaSyncRecord, buildEncryptedDoc, toPlainRecord };
