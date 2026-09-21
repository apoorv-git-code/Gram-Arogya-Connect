/**
 * src/models/SosDispatch.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Emergency dispatch log. This is operational data an ambulance team and
 * dispatch control room need to see and act on immediately, so unlike
 * Profile/AshaSyncRecord it's stored in the clear rather than encrypted —
 * encrypting it would slow down or block exactly the people who need to
 * read it fastest during a real emergency. See SUGGESTIONS.md for the
 * access-control approach recommended instead of encryption here.
 */

'use strict';

const { Schema, model } = require('mongoose');

const sosDispatchSchema = new Schema(
  {
    dispatchId: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    emergencyType: { type: String, default: 'General Emergency' },
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, default: 'Address not provided' },
    },
    assignedVehicle: {
      vehicleId: String,
      type: String,
    },
    etaMins: { type: Number, required: true },
    status: { type: String, default: 'dispatched' },
    triggeredAt: { type: String, required: true },
  },
  { timestamps: true }
);

const SosDispatch = model('SosDispatch', sosDispatchSchema);

module.exports = { SosDispatch };
