'use strict';

const { Schema, model } = require('mongoose');

const recordShareSchema = new Schema({
  patientId: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  lastAccessedAt: { type: Date, default: null },
  accessCount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model('RecordShare', recordShareSchema);
