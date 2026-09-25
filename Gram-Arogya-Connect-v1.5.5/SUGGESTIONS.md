# SUGGESTIONS.md — further changes recommended for backend & server

This version adds MongoDB, encryption, an offline auto-sync queue, security
middleware, and validation. It's a big step up from the mock-data version,
but it is still not production-ready for real patient data. In priority
order, here's what's genuinely essential next:

## Do before any real deployment (high priority)

1. **Real authentication & authorization.** Right now `GET /api/v1/profile`
   returns whoever's `patientId` you ask for — there's no login, no
   session, no check that the caller is allowed to see that patient. Add
   JWT-based auth (or ABDM/ABHA's own OAuth flow, since this is an ABHA
   integration) and lock every route that touches patient data behind it.
   This is the single biggest gap.

2. **Secrets management.** `ENCRYPTION_KEY` and `MONGODB_URI` currently
   live in `.env`. For a real deployment, pull them from a proper secrets
   manager (AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or
   even just your hosting platform's encrypted env vars) — never commit
   `.env`, and rotate the encryption key on a schedule with a documented
   re-encryption migration plan (right now there is no key-rotation path;
   changing `ENCRYPTION_KEY` makes existing records undecryptable).

3. **HTTPS in front of real traffic.** `src/config/https.js` lets the
   Node process terminate TLS directly, which is fine for a quick demo,
   but for production put a reverse proxy (Nginx, Caddy, or a managed
   load balancer) in front with a real certificate (Let's Encrypt via
   Certbot, or your cloud provider's managed cert) and proxy plain HTTP
   to Node behind it. It's easier to patch, easier to rotate certs, and
   keeps TLS termination out of your app code.

4. **The "FTP layer" as named isn't literal FTP — and that's correct.**
   The prompt / project notes called this an "FTP" layer; actual FTP
   (File Transfer Protocol) sends everything, including credentials,
   unencrypted, and has no concept of structured records or dedupe. I
   deliberately implemented the auto-sync layer as
   `src/utils/offlineQueue.js` instead — encrypted-at-rest, JSON-based,
   dedupe-safe. If a literal file-transfer channel is still required
   for some external system, use SFTP (FTP over SSH) or FTPS, never
   plain FTP.

## Do soon after (medium priority)

5. **Audit logging.** Every read/write of a patient record should leave
   a trail: who (once auth exists), what, when. Right now there's no way
   to answer "who looked at this patient's data" after the fact — that's
   a real requirement for health data, not just nice-to-have.

6. **Encryption key rotation & envelope encryption.** Right now one key
   encrypts everything. A more robust pattern is envelope encryption: a
   master key (in a KMS) encrypts per-record data keys, so you can rotate
   the master key without re-encrypting every record.

7. **CSP (Content-Security-Policy).** I left Helmet's CSP off
   (`contentSecurityPolicy: false` in `src/middleware/security.js`)
   because the current frontend inlines styles/scripts in ways a strict
   CSP would break. Once the frontend's asset list is finalized, write a
   tuned CSP and turn it back on — running without one is the biggest
   remaining gap `helmet()` doesn't close for you automatically.

8. **Input validation library.** The validators in `src/validators/` are
   hand-rolled to keep the dependency footprint small. If the schema
   grows much further, switch to `zod` or `express-validator` so
   validation rules live in one declarative place instead of scattered
   `if` statements.

9. **Move the offline queue off local disk for multi-instance deployments.**
   `src/utils/offlineQueue.js` writes to a JSON file on the server's own
   disk. That's fine for a single server, but if you ever run more than
   one instance (for scaling or high availability), queued records on
   one instance's disk are invisible to the others. Replace it with a
   proper message queue (Redis, RabbitMQ, or MongoDB itself as a
   "pending" collection) once you scale past one instance.

10. **SOS dispatch persistence.** `sosController.js` currently logs a
    persistence failure to the console and moves on — good for not
    blocking the emergency response, but there's no alerting on that
    failure. Wire it to a paging/alerting system (PagerDuty, an SMS
    webhook) so a human actually notices if dispatch records stop
    saving.

## Nice to have (lower priority, but worth planning for)

11. **Automated tests beyond the smoke test.** `tests/controller-smoke.js`
    checks the happy path. Add tests for the validators (reject bad
    input), the idGuard (reject raw ID numbers), and the offline queue
    (record survives a simulated DB outage and syncs after reconnect).

12. **Structured logging.** `console.log`/`console.error` work for a demo;
    for production, use a structured logger (pino, winston) so logs can
    be shipped to a log aggregator and filtered/alerted on.

13. **API versioning discipline.** The `/api/v1/` prefix is already in
    place — good. Just keep new breaking changes on `/api/v2/` rather than
    changing `v1` responses out from under existing ASHA-worker app
    installs in the field, which may not update immediately.

14. **Database indexes review.** `clientRecordId` uniqueness gives you a
    dedupe index for free, but as data grows, review query patterns
    (e.g. `Profile.findOne({ patientId })`, `AshaSyncRecord.find({ deviceId })`)
    and add compound indexes to match your actual read patterns once you
    have real traffic to profile.
