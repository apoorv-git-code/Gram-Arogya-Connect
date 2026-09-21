'use strict';

const crypto = require('crypto');
const { isDbConnected } = require('../config/db');
const { Profile, buildEncryptedDoc, toPlainProfile } = require('../models/Profile');
const offlineQueue = require('../utils/offlineQueue');

function emptyProfile(user) {
  return {
    patientId: user.patientId,
    name: user.name,
    age: null,
    gender: '',
    bloodGroup: '',
    abhaIdMasked: null,
    village: '',
    primaryHealthCenter: user.selectedPhc?.name || '',
    vitals: {},
    allergies: [],
    chronicConditions: [],
    lastUpdatedAt: null,
  };
}

function maskAbhaId(rawId, fallback = null) {
  if (typeof rawId !== 'string' || !rawId.trim()) return fallback;
  const digits = rawId.replace(/\D/g, '');
  return `91-XXXX-XXXX-${digits.slice(-4).padStart(4, 'X')}`;
}

async function saveEncryptedDoc(doc) {
  await Profile.updateOne({ clientRecordId: doc.clientRecordId }, { $setOnInsert: doc }, { upsert: true });
}
offlineQueue.registerSaver('profile', saveEncryptedDoc);

async function getLatest(patientId) {
  if (!isDbConnected()) return null;
  const doc = await Profile.findOne({ patientId }).sort({ createdAt: -1 }).lean();
  return doc ? toPlainProfile(doc) : null;
}

async function getProfile(req, res, next) {
  try {
    const saved = await getLatest(req.user.patientId);
    return res.json({ success: true, message: saved ? 'Patient profile retrieved successfully.' : 'New profile ready.', data: saved || emptyProfile(req.user) });
  } catch (error) { next(error); }
}

async function saveProfile(req, res, next) {
  try {
    const current = (await getLatest(req.user.patientId)) || emptyProfile(req.user);
    const updates = { ...req.body };
    if (updates.abhaId || updates.abhaIdMasked) {
      updates.abhaIdMasked = maskAbhaId(updates.abhaId || updates.abhaIdMasked, current.abhaIdMasked);
      delete updates.abhaId;
    }
    const profile = {
      ...current,
      ...updates,
      patientId: req.user.patientId,
      name: updates.name || current.name || req.user.name,
      primaryHealthCenter: updates.primaryHealthCenter ?? current.primaryHealthCenter ?? req.user.selectedPhc?.name ?? '',
      lastUpdatedAt: new Date().toISOString(),
    };
    const record = { ...profile, clientRecordId: crypto.randomUUID() };
    const encrypted = buildEncryptedDoc(record);
    if (isDbConnected()) {
      await saveEncryptedDoc(encrypted);
      return res.json({ success: true, message: 'Patient profile saved securely.', data: profile });
    }
    offlineQueue.enqueue('profile', encrypted);
    return res.status(202).json({ success: true, message: 'Profile queued for secure sync.', data: profile });
  } catch (error) { next(error); }
}

async function saveProfileBatch(req, res, next) {
  try {
    let synced = 0, queued = 0;
    for (const item of req.body.profiles) {
      const record = { ...item, patientId: req.user?.patientId || item.patientId, clientRecordId: item.clientRecordId || crypto.randomUUID() };
      const encrypted = buildEncryptedDoc(record);
      if (isDbConnected()) { await saveEncryptedDoc(encrypted); synced += 1; }
      else { offlineQueue.enqueue('profile', encrypted); queued += 1; }
    }
    res.json({ success: true, data: { totalReceived: req.body.profiles.length, synced, queued } });
  } catch (error) { next(error); }
}

module.exports = { getProfile, saveProfile, saveProfileBatch };
