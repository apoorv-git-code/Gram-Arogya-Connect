'use strict';

const crypto = require('crypto');
const RecordShare = require('../models/RecordShare');
const { Profile, toPlainProfile } = require('../models/Profile');
const { isDbConnected } = require('../config/db');
const { toSvg } = require('../utils/qrSvg');

const tokenHash = token => crypto.createHash('sha256').update(token).digest('hex');
const SHARE_DAYS = Math.max(1, Math.min(90, Number(process.env.RECORD_SHARE_DAYS) || 30));

function publicBaseUrl(req) {
  const configured = String(process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  return `${req.protocol}://${req.get('host')}`;
}

async function createShare(req, res, next) {
  try {
    if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database unavailable.', data: null });
    const now = new Date();
    // A fresh token is generated when the card loads. Older unexpired links remain
    // valid until their expiry so a doctor already viewing one is not interrupted.
    const token = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + SHARE_DAYS * 24 * 60 * 60 * 1000);
    await RecordShare.create({ patientId: req.user.patientId, tokenHash: tokenHash(token), expiresAt });
    const shareUrl = `${publicBaseUrl(req)}/doctor.html?t=${encodeURIComponent(token)}`;
    return res.status(201).json({
      success: true,
      message: 'Secure doctor QR created.',
      data: { shareUrl, qrSvg: toSvg(shareUrl), expiresAt },
    });
  } catch (error) { next(error); }
}

async function readShare(req, res, next) {
  try {
    if (!isDbConnected()) return res.status(503).json({ success: false, message: 'Database unavailable.', data: null });
    const token = String(req.params.token || '');
    if (token.length < 32 || token.length > 128) return res.status(404).json({ success: false, message: 'This record link is invalid or expired.', data: null });
    const share = await RecordShare.findOne({ tokenHash: tokenHash(token), revokedAt: null, expiresAt: { $gt: new Date() } });
    if (!share) return res.status(404).json({ success: false, message: 'This record link is invalid or expired.', data: null });
    const doc = await Profile.findOne({ patientId: share.patientId }).sort({ createdAt: -1 }).lean();
    const profile = doc ? toPlainProfile(doc) : null;
    if (!profile) return res.status(404).json({ success: false, message: 'No health record is available for this patient yet.', data: null });
    await RecordShare.updateOne({ _id: share._id }, { $set: { lastAccessedAt: new Date() }, $inc: { accessCount: 1 } });
    const data = {
      name: profile.name || 'Patient',
      age: profile.age || null,
      gender: profile.gender || '',
      bloodGroup: profile.bloodGroup || '',
      village: profile.village || '',
      primaryHealthCenter: profile.primaryHealthCenter || '',
      conditions: profile.conditions || profile.chronicConditions || [],
      allergies: profile.allergies || [],
      abhaIdMasked: profile.abhaIdMasked || null,
      lastUpdatedAt: profile.lastUpdatedAt || profile.updatedAt || null,
    };
    return res.json({ success: true, message: 'Shared health record retrieved.', data });
  } catch (error) { next(error); }
}

module.exports = { createShare, readShare };
