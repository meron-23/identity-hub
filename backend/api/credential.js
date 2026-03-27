const express = require('express');
const router = express.Router();

const userService = require('../services/userService');
const authService = require('../services/authService');
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/credential/:userId
 * --------------------------------------------------
 * Purpose  : Returns a signed verifiable credential (JWT) for a given user.
 *            Acts as proof of completed eKYC / identity verification.
 *            This credential can be shared with third-party services.
 *
 * Headers:
 *   Authorization: Bearer <token>   // JWT from POST /api/auth (required)
 *
 * Path Params:
 *   userId (string) — UUID of the enrolled user
 *
 * Response 200:
 *   {
 *     "message":    "Verifiable credential issued",
 *     "credential": "eyJhbGci..."   // Signed JWT with name + verified status
 *   }
 *
 * JWT Credential Payload:
 *   {
 *     "sub":      "userId",
 *     "name":     "Fikre Demo",
 *     "verified": true,
 *     "type":     "credential",
 *     "iss":      "identity-hub",
 *     "exp":      <24h from issue>
 *   }
 *
 * Response 401: Missing or invalid Bearer token
 * Response 404: User not found
 * Response 500: Server error
 */
router.get('/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const credential = authService.generateCredentialToken(
      user.userId,
      user.name,
      user.verified
    );

    return res.status(200).json({
      message: 'Verifiable credential issued',
      credential,
    });
  } catch (err) {
    console.error('[/api/credential]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
