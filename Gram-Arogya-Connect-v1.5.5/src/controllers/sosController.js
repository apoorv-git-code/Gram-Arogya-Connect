/**
 * src/controllers/sosController.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Handles emergency SOS dispatch triggers (e.g. "SOS-108" style ambulance
 * requests) from rural patients or ASHA workers. Emits a real-time
 * "sos:alert" event via Socket.io so dispatch control rooms and nearby
 * vehicle operators are notified instantly.
 *
 * EMERGENCY-PATH RULE: the HTTP response (vehicle assigned + ETA) must
 * never be held up waiting on the database. We respond and broadcast the
 * socket event first, then persist the dispatch record to MongoDB in the
 * background — a slow/unreachable DB should never delay an ambulance.
 *
 * Wired via src/routes/api.js:
 *   POST /api/v1/sos -> dispatch
 *   (validators/sosValidator.js runs first: shape check + 10s cooldown)
 */

'use strict';

const { isDbConnected } = require('../config/db');
const { SosDispatch } = require('../models/SosDispatch');

const mockDispatchLog = [];

const mockAvailableVehicles = [
  { vehicleId: 'UP-108-AMB-014', type: 'Basic Life Support Ambulance' },
  { vehicleId: 'UP-108-AMB-027', type: 'Advanced Life Support Ambulance' },
  { vehicleId: 'UP-108-AMB-031', type: 'Basic Life Support Ambulance' },
];

function generateDispatchId() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SOS-108-${randomSuffix}`;
}

function assignVehicleAndEta() {
  const vehicle = mockAvailableVehicles[Math.floor(Math.random() * mockAvailableVehicles.length)];
  const etaMins = Math.floor(8 + Math.random() * 17);
  return { vehicle, etaMins };
}

/**
 * POST /api/v1/sos
 * Expects: { patientName, location: { lat, lng, address }, emergencyType }
 */
async function dispatch(req, res, next) {
  try {
    const { patientName, location, emergencyType } = req.body;

    const dispatchId = generateDispatchId();
    const { vehicle, etaMins } = assignVehicleAndEta();
    const triggeredAt = new Date().toISOString();

    const dispatchRecord = {
      dispatchId,
      patientName,
      emergencyType: emergencyType || 'General Emergency',
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address || 'Address not provided',
      },
      assignedVehicle: vehicle,
      etaMins,
      status: 'dispatched',
      triggeredAt,
    };

    mockDispatchLog.push(dispatchRecord);

    // Respond and broadcast FIRST — an emergency response must never wait on a DB write.
    const io = req.app.get('io');
    if (io && typeof io.emit === 'function') {
      io.emit('sos:alert', dispatchRecord);
    } else {
      console.warn('[sosController.dispatch] Socket.io instance not found on app — skipping real-time emit.');
    }

    res.status(201).json({
      success: true,
      message: 'Emergency dispatch triggered successfully.',
      data: dispatchRecord,
    });

    // Persist in the background, best-effort. Not queued via offlineQueue
    // on purpose — a dispatch that failed to log is not something we want
    // silently retried minutes later; it should show up in server logs
    // immediately for a human to check (see SUGGESTIONS.md).
    if (isDbConnected()) {
      SosDispatch.create(dispatchRecord).catch(dbError => {
        console.error('[sosController.dispatch] Failed to persist dispatch record:', dbError.message);
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  dispatch,
};
