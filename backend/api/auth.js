const express = require('express');
const router = express.Router();

const aiService = require('../services/aiService');
const userService = require('../services/userService');
const authService = require('../services/authService');

/**
 * POST /api/auth
 * --------------------------------------------------
 * Purpose  : Authenticate an enrolled user by verifying their live selfie.
 *            Issues a JWT access token on success.
 *
 * Request Body:
 *   {
 *     "userId": "uuid-v4",           // UUID from enrollment (required)
 *     "selfie": "base64string..."    // Live selfie for liveness check (required)
 *   }
 *
 * Response 200:
 *   {
 *     "message": "Authentication successful",
 *     "token":   "eyJhbGciOiJIUzI1NiIs..."
 *   }
 *
 * Response 400: Missing fields
 * Response 401: Liveness check failed
 * Response 404: User not found
 * Response 500: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { userId, selfie } = req.body;

    if (!userId || !selfie) {
      return res.status(400).json({ error: 'Missing required fields: userId, selfie' });
    }

    // --- Look up user in MongoDB ---
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found. Please enroll first.' });
    }

    // --- Call AI service for liveness verification ---
    const livenessResult = await aiService.verifyLiveness(selfie);

    if (!livenessResult.live || livenessResult.score < 0.75) {
      return res.status(401).json({
        error: 'Liveness check failed. Authentication denied.',
        score: livenessResult.score,
      });
    }

    // --- Generate JWT access token ---
    const token = authService.generateAuthToken(user.userId, user.name);

    return res.status(200).json({
      message: 'Authentication successful',
      token,
    });
  } catch (err) {
    console.error('[/api/auth]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
