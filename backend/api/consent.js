const express = require('express');
const router = express.Router();

const Consent = require('../models/Consent');
const userService = require('../services/userService');

/**
 * POST /api/consent
 * --------------------------------------------------
 * Purpose  : Record that a user has approved sharing their KYC data
 *            with a specific third-party service.
 *            Duplicate consents (same userId + serviceName) are ignored.
 *
 * Request Body:
 *   {
 *     "userId":      "uuid-v4",      // Enrolled user ID (required)
 *     "serviceName": "BankApp"       // Name of the third-party service (required)
 *   }
 *
 * Response 201:
 *   {
 *     "message": "Consent recorded",
 *     "consent": {
 *       "userId":      "uuid-v4",
 *       "serviceName": "BankApp",
 *       "createdAt":   "2024-..."
 *     }
 *   }
 *
 * Response 400: Missing fields or user not found
 * Response 409: Consent already exists
 * Response 500: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { userId, serviceName } = req.body;

    if (!userId || !serviceName) {
      return res.status(400).json({ error: 'Missing required fields: userId, serviceName' });
    }

    // Confirm user exists
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(400).json({ error: 'User not found. Please enroll first.' });
    }

    // Use findOneAndUpdate with upsert=false to detect duplicates cleanly
    const existing = await Consent.findOne({ userId, serviceName });
    if (existing) {
      return res.status(409).json({
        message: 'Consent already recorded for this service.',
        consent: existing,
      });
    }

    const consent = await Consent.create({ userId, serviceName });

    return res.status(201).json({
      message: 'Consent recorded',
      consent: {
        userId:      consent.userId,
        serviceName: consent.serviceName,
        createdAt:   consent.createdAt,
      },
    });
  } catch (err) {
    console.error('[POST /api/consent]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/consent/:userId
 * --------------------------------------------------
 * Purpose  : Retrieve all services that a user has approved for KYC data sharing.
 *
 * Path Params:
 *   userId (string) — UUID of the enrolled user
 *
 * Response 200:
 *   {
 *     "userId":   "uuid-v4",
 *     "services": ["BankApp", "InsureCo", "CryptoExchange"]
 *   }
 *
 * Response 404: User not found
 * Response 500: Server error
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const consents = await Consent.find({ userId }).select('serviceName createdAt -_id');
    const services = consents.map((c) => c.serviceName);

    return res.status(200).json({ userId, services });
  } catch (err) {
    console.error('[GET /api/consent]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
