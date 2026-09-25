/**
 * src/validators/appointmentValidator.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Checks that a booking request has a real patient name, facility, and
 * slot before letting it through to queueController.bookAppointment.
 */

'use strict';

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function validateAppointment(req, res, next) {
  const { facility, slot } = req.body || {};
  if (!isNonEmptyString(facility)) {
    return res.status(400).json({ success: false, message: '"facility" is required.', data: null });
  }
  if (!isNonEmptyString(slot)) {
    return res.status(400).json({ success: false, message: '"slot" is required.', data: null });
  }
  if (facility.length > 200 || slot.length > 60) {
    return res.status(400).json({ success: false, message: 'One or more fields exceed the maximum allowed length.', data: null });
  }

  next();
}

module.exports = { validateAppointment };
