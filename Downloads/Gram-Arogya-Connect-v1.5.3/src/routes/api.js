const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const userAuth = require('../controllers/userAuthController');
const ashaController = require('../controllers/ashaController');
const facilityController = require('../controllers/facilityController');
const queueController = require('../controllers/queueController');
const syncController = require('../controllers/syncController');
const sosController = require('../controllers/sosController');

const { validateProfile } = require('../validators/profileValidator');
const { validateProfileBatch } = require('../validators/profileBatchValidator');
const { validateAppointment } = require('../validators/appointmentValidator');
const { validateSyncBatch } = require('../validators/syncValidator');
const { validateSos } = require('../validators/sosValidator');
const { sosLimiter } = require('../middleware/security');

// Account authentication
router.post('/auth/register', userAuth.register);
router.post('/auth/login', userAuth.login);
router.get('/auth/me', userAuth.requireAuth, userAuth.me);
router.post('/auth/logout', userAuth.requireAuth, userAuth.logout);
router.post('/auth/location', userAuth.requireAuth, userAuth.saveLocation);
router.get('/facilities/nearby', userAuth.requireAuth, facilityController.nearby);

// Profile / ABHA
router.get('/profile', userAuth.requireAuth, authController.getProfile);
router.post('/profile', userAuth.requireAuth, validateProfile, authController.saveProfile);
router.post('/profile/batch', userAuth.requireAuth, validateProfileBatch, authController.saveProfileBatch);

// Appointments & live queue
router.get('/queue', userAuth.requireAuth, queueController.getQueue);
router.get('/appointments', userAuth.requireAuth, queueController.listAppointments);
router.post('/appointments', userAuth.requireAuth, validateAppointment, queueController.bookAppointment);

// ASHA workspace (role protected)
router.get('/asha/patients', userAuth.requireAuth, ashaController.requireAsha, ashaController.patients);

// Offline ASHA sync
router.post('/sync/asha', validateSyncBatch, syncController.syncAshaRecords);
router.get('/sync/asha', syncController.getSyncHistory);

// Emergency — extra rate limiter on top of the cooldown validator
router.post('/sos', sosLimiter, validateSos, sosController.dispatch);

router.get('/health', (req, res) => res.json({ ok: true, service: 'gram-arogya-connect-api' }));

module.exports = router;
