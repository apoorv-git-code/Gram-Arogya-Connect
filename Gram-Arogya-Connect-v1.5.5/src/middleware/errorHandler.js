/**
 * src/middleware/errorHandler.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * The "something went wrong" catcher. Two pieces:
 *   - notFound: any URL that doesn't match a route (API or static) ends
 *     up here with a clean 404 instead of Express's default HTML page.
 *   - globalErrorHandler: the LAST middleware in the chain. If literally
 *     anything else in the app throws — a route handler, a validator, a
 *     database call — Express funnels it here instead of crashing the
 *     process or leaking a stack trace to the visitor.
 *
 * Wiring rule: globalErrorHandler must be registered AFTER every route
 * in server.js, and every async controller must either use try/catch or
 * call next(error) so this actually gets a chance to run.
 */

'use strict';

function notFound(req, res) {
  res.status(404).json({ success: false, message: 'Route not found.', data: null });
}

function globalErrorHandler(error, req, res, next) {
  // Full details go to the server log only — never to the client.
  console.error('[errorHandler] Unhandled error:', error);

  if (res.headersSent) {
    return next(error);
  }

  // Mongoose validation errors are safe to summarize back to the client
  // (they describe what was wrong with the *input*, not the system).
  if (error && error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed for one or more fields.',
      data: null,
    });
  }

  // Duplicate key (e.g. clientRecordId already exists) — treat as a
  // harmless "already synced" case rather than a hard failure.
  if (error && error.code === 11000) {
    return res.status(200).json({
      success: true,
      message: 'Record already synced previously — no duplicate created.',
      data: null,
    });
  }

  return res.status(500).json({
    success: false,
    message: 'Unexpected server error. Our team has been notified.',
    data: null,
  });
}

module.exports = { notFound, globalErrorHandler };
