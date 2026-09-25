'use strict';

const assert = require('node:assert/strict');
const auth = require('../src/controllers/authController');
const queue = require('../src/controllers/queueController');
const sos = require('../src/controllers/sosController');
const sync = require('../src/controllers/syncController');

function invoke(handler, { body = {}, query = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = { body, query, app: { get: () => ({ emit() {} }) } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ statusCode: this.statusCode, payload }); return this; }
    };
    Promise.resolve(handler(req, res)).catch(reject);
  });
}

async function run() {
  const responses = await Promise.all([
    invoke(auth.getProfile),
    invoke(queue.getQueue),
    invoke(queue.bookAppointment, { body: { patientName: 'Test Patient', facility: 'PHC Chandapur North', slot: '11:30 AM' } }),
    invoke(sos.dispatch, { body: { patientName: 'Test Patient', location: { lat: 18.5, lng: 73.1, address: 'Test village' } } }),
    invoke(sync.syncAshaRecords, { body: { deviceId: 'asha-test', records: [{ patientName: 'Test Patient', visitDate: new Date().toISOString() }] } })
  ]);

  for (const response of responses) {
    assert.equal(response.payload.success, true);
    assert.ok(response.payload.data);
    assert.ok(response.statusCode >= 200 && response.statusCode < 300);
  }
  assert.match(queue.getSnapshot().nowServing, /^A-\d+$/);
  console.log('Controller smoke tests passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
