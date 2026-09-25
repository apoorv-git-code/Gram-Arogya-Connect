/**
 * src/config/https.js
 * Gram Arogya Connect (SIH 2026, PS #26133)
 *
 * Loads a TLS certificate + key from disk (paths given via .env) so the
 * server can run over HTTPS directly. This is meant for local/dev use or
 * a small VM deployment; in a real production rollout you'd usually
 * terminate TLS at a reverse proxy (Nginx) or load balancer instead and
 * this file simply wouldn't be used (see SUGGESTIONS.md).
 *
 * If SSL_KEY_PATH / SSL_CERT_PATH are not set, or the files don't exist,
 * this returns null and server.js quietly falls back to plain HTTP —
 * the app never crashes because HTTPS wasn't configured.
 */

'use strict';

const fs = require('fs');
const path = require('path');

function loadHttpsOptions() {
  const keyPath = process.env.SSL_KEY_PATH;
  const certPath = process.env.SSL_CERT_PATH;

  if (!keyPath || !certPath) {
    return null;
  }

  try {
    const resolvedKey = path.resolve(keyPath);
    const resolvedCert = path.resolve(certPath);

    if (!fs.existsSync(resolvedKey) || !fs.existsSync(resolvedCert)) {
      console.warn('[https] SSL_KEY_PATH/SSL_CERT_PATH set but file(s) not found — staying on HTTP.');
      return null;
    }

    return {
      key: fs.readFileSync(resolvedKey),
      cert: fs.readFileSync(resolvedCert),
    };
  } catch (error) {
    console.warn(`[https] Failed to load SSL certificate/key (${error.message}) — staying on HTTP.`);
    return null;
  }
}

module.exports = { loadHttpsOptions };
