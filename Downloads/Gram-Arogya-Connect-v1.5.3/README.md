# Gram Arogya Connect

A mobile-first rural healthcare companion for patients, ASHA workers, and PHC care teams. The interface is designed to remain useful on slow or interrupted connections and provides clear fallbacks when the demo backend is unavailable.

## What is included

- Guided symptom check with urgent-symptom escalation
- Video/audio teleconsultation workspace with device checks and call controls
- PHC appointment booking and a live Socket.IO queue
- Local medicine adherence tracking
- ABHA-style health summary and document timeline
- ASHA priority-visit workspace with offline batch sync
- Emergency dispatch flow with location fallback
- Offline English, Hindi, and Marathi translation across the full interface
- Responsive desktop and mobile layouts
- iOS-inspired glass surfaces, native-feeling controls, and refined motion
- Persistent collapsible desktop sidebar with a compact icon rail
- Accessible loading, focus, reduced-motion, and connection states

## Requirements

- Node.js 22 or newer (Node.js 24 LTS recommended)
- npm, included with Node.js
- A current version of Chrome, Edge, Firefox, or Safari
- MongoDB (optional — see below; the app runs fine without it)

## Install and run

Extract the complete ZIP, open a terminal in the extracted folder, and run:

```bash
npm ci
cp .env.example .env
```

Open `.env` and set `ENCRYPTION_KEY` (generate one with the command in the
comment above it in `.env.example`). If you have MongoDB running locally
or a connection string for a hosted instance (e.g. MongoDB Atlas), set
`MONGODB_URI` too — if you skip this, the app still runs, using its
built-in offline queue and in-memory fallback data until a database is
available.

```bash
npm start
```

Open <http://localhost:4000>.

### Running with MongoDB (recommended)

```bash
# if you don't already have MongoDB installed locally:
#   https://www.mongodb.com/docs/manual/installation/
mongod --dbpath ./mongo-data &
npm start
```

### Running without MongoDB

Just run `npm start`. Every patient profile and ASHA visit record you
create will be encrypted and queued in `src/data/offline-queue.json`
(git-ignored) and auto-synced to MongoDB the moment `MONGODB_URI` becomes
reachable — nothing is lost while it's offline.

### Optional: HTTPS

Set `SSL_KEY_PATH` and `SSL_CERT_PATH` in `.env` to a key/cert pair to
serve directly over HTTPS. For local testing, generate a self-signed pair:

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365
```

For real deployments, terminate TLS at a reverse proxy instead — see
`SUGGESTIONS.md`.

For automatic server restarts while editing:

```bash
npm run dev
```

If port 4000 is busy:

```bash
PORT=4001 npm start
```

Then open <http://localhost:4001>.

## Project layout

```text
public/
  index.html             Interface structure
  css/style.css          Design system and responsive layout
  js/app.js              Frontend state, API calls, and interactions
  images/                Local visual assets
src/
  config/db.js           MongoDB connection (never crashes the app if DB is down)
  config/https.js        Optional HTTPS cert/key loader
  controllers/           Profile, queue, SOS, and sync request handlers
  middleware/security.js Helmet, NoSQL-injection sanitizer, rate limiting
  middleware/errorHandler.js  404 + global error catcher
  models/                Mongoose schemas (Profile, AshaSyncRecord, SosDispatch)
  utils/encryption.js    AES-256-GCM field-level encryption
  utils/idGuard.js       Blocks raw/unmasked government ID numbers
  utils/offlineQueue.js  Offline auto-sync queue (the "FTP layer")
  validators/            Per-route input validation middleware
  routes/api.js          REST API routes
  server.js              Express, Socket.IO, and HTTPS server bootstrap
```

## API routes

All API routes begin with `/api/v1`.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Server health check |
| GET/POST | `/profile` | Read or update the patient profile |
| POST | `/profile/batch` | Flush a batch of offline-collected profiles |
| GET | `/queue` | Read the live queue |
| POST | `/appointments` | Book a queue token |
| POST | `/sos` | Trigger an emergency dispatch (rate-limited + 10s cooldown) |
| GET/POST | `/sync/asha` | Read or submit ASHA offline-sync batches |

## Data, encryption, and privacy

Patient profiles and ASHA visit records are encrypted at rest (AES-256-GCM,
`src/utils/encryption.js`) before they touch MongoDB or the offline queue
file. Raw/unmasked government ID numbers (Aadhaar, ABHA) are rejected by
`src/utils/idGuard.js` wherever they appear in a request — only masked IDs
("91-XXXX-XXXX-1234") are ever stored. If MongoDB isn't reachable, records
are encrypted and queued locally, then auto-synced once it is (see
`src/utils/offlineQueue.js`). See `SUGGESTIONS.md` for what's still needed
before this should hold real patient data (authentication is the big one).

## v1.5.0 fresh-start behavior
- Uses a fresh local MongoDB database by default: `gram_arogya_connect_v15`, so old demo/users from v1.4 do not appear.
- New accounts start with an empty health profile, consultation history, records, prescriptions, and medicine list.
- Health profile data is keyed by the authenticated user's unique patient ID and encrypted before MongoDB storage.
- Browser profile cache is also namespaced by patient ID, preventing one signed-in person's profile from appearing for another.
- Existing v1.4 data is not deleted; it remains in the old `gram_arogya_connect` database unless you explicitly remove it.

## v1.5.3 changes
- The login screen is shown on every app/site opening; an existing session never bypasses the login gate.
- "Remember my login ID" can prefill the previous login ID and role. The app never stores the password.
- Registration returns to the login gate so the new account must authenticate before entering.
- Removed demo BP/SpO2/timeline values and demo PHC appointment options.
- Appointments are now stored per patient in MongoDB (`appointments` collection).
- Queue counts are derived from saved appointments; fake token progression, fake wait times, and random offline confirmations were removed.
- PHC suggestions come from location/facility lookup rather than bundled example facilities.
