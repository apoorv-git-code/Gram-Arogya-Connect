/**
 * src/middleware/security.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Protective layers applied to every request, in order, before it's
 * trusted to reach any route:
 *   - helmet()   — standard security headers (no thinking required)
 *   - sanitize   — strips Mongo operator characters ($ and dot-paths)
 *                  out of body/query/params so nobody can inject a NoSQL
 *                  operator like { "$gt": "" } into a query
 *   - apiLimiter — caps how many requests one IP can make per minute,
 *                  so one visitor can't hammer the server
 *   - sosLimiter — a stricter limiter just for the emergency endpoint
 */

'use strict';

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Recursively strips any object key starting with "$" or containing "."
 * — the two ways a NoSQL/Mongo injection payload sneaks a query operator
 * into what should be plain data. Mutates in place (important: some
 * Express versions make req.query a getter-only property, so we can't
 * reassign req.query itself, only its contents).
 * @param {*} value
 */
function stripMongoOperators(value) {
  if (Array.isArray(value)) {
    value.forEach(stripMongoOperators);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
        continue;
      }
      stripMongoOperators(value[key]);
    }
  }
  return value;
}

function sanitize(req, res, next) {
  if (req.body) stripMongoOperators(req.body);
  if (req.query) stripMongoOperators(req.query);
  if (req.params) stripMongoOperators(req.params);
  next();
}

// General API traffic: generous enough for normal app use, tight enough
// to blunt a hammering script.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down and try again shortly.', data: null },
});

// The SOS endpoint gets its own, tighter limiter — a flood of fake
// emergency triggers is a worse outcome than a flood of anything else.
const sosLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.SOS_RATE_LIMIT_PER_MINUTE) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many emergency triggers from this connection. If this is a real emergency, call 108 directly.', data: null },
});

module.exports = {
  helmetMiddleware: helmet({
    // Keep CSP off by default here — the static frontend loads its own
    // fonts/scripts and a strict default CSP would break it. See
    // SUGGESTIONS.md for adding a tuned CSP once the frontend's asset
    // list is finalized.
    contentSecurityPolicy: false,
  }),
  sanitize,
  apiLimiter,
  sosLimiter,
};
