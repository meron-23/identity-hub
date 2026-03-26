const express = require('express');
const router = express.Router();

const aiService = require('../services/aiService');
const userService = require('../services/userService');

/**
 * POST /api/enroll
 * --------------------------------------------------
 * Purpose  : Enroll a new user by verifying their ID document and selfie
 *            using an external AI face-match service.
 *
 * Request Body:
 *   {
 *     "name":    "Fikre Demo",        // Full name (string, required)
 *     "idImage": "base64string...",   // Base64 encoded ID card image (required)
 *     "selfie":  "base64string..."    // Base64 encoded selfie image (required)
 *   }
 *
 * Response 201:
 *   {
 *     "message": "User enrolled successfully",
 *     "user": {
 *       "userId":         "uuid-v4",
 *       "name":           "Fikre Demo",
 *       "dob":            "1990-01-01",
 *       "verified":       true,
 *       "faceMatchScore": 0.97,
 *       "createdAt":      "2024-..."
 *     }
 *   }
 *
 * Response 400: Missing fields or face match score too low (<0.75)
 * Response 500: Server error
 */
router.post('/', async (req, res) => {
  try {
    const { name, idImage, selfie } = req.body;

    // --- Validate required fields ---
    if (!name || !idImage || !selfie) {
      return res.status(400).json({
        error: 'Missing required fields: name, idImage, selfie',
      });
    }

    // --- Call AI service to verify face match ---
    const aiResult = await aiService.verifyFaceMatch(idImage, selfie);

    // Reject enrollment if face match score is below threshold
    if (!aiResult.match || aiResult.score < 0.75) {
      return res.status(400).json({
        error: 'Face match failed. Score too low or identity mismatch.',
        score: aiResult.score,
      });
    }

    // --- Create and persist user ---
    const user = await userService.createUser({
      name: aiResult.name || name, // prefer AI-extracted name if available
      dob: aiResult.dob || null,
      idImage,
      faceMatchScore: aiResult.score,
    });

    return res.status(201).json({
      message: 'User enrolled successfully',
      user: {
        userId:         user.userId,
        name:           user.name,
        dob:            user.dob,
        verified:       user.verified,
        faceMatchScore: user.faceMatchScore,
        createdAt:      user.createdAt,
      },
    });
  } catch (err) {
    console.error('[/api/enroll]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
