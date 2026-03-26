const express = require('express');
const router = express.Router();

const userService = require('../services/userService');
const authService = require('../services/authService');

/**
 * GET /api/sso?redirect_url=<url>
 * --------------------------------------------------
 * Purpose  : Simplified OAuth2 / SSO flow.
 *            Simulates a login for the first enrolled user and redirects
 *            back to the client's redirect_url with a JWT token appended
 *            as a query parameter: ?token=JWT_TOKEN
 *
 * Query Params:
 *   redirect_url (string, required) — URL to redirect back to after login
 *
 * Response 302: Redirect to redirect_url?token=JWT_TOKEN
 * Response 400: Missing redirect_url
 * Response 404: No enrolled users found
 * Response 500: Server error
 */
router.get('/', async (req, res) => {
  try {
    const { redirect_url } = req.query;

    if (!redirect_url) {
      return res.status(400).json({ error: 'Missing query parameter: redirect_url' });
    }

    // --- Simulate login using first enrolled user (demo) ---
    const user = await userService.getFirstUser();
    if (!user) {
      return res.status(404).json({
        error: 'No enrolled users found. Please enroll a user first.',
      });
    }

    const token = authService.generateAuthToken(user.userId, user.name);

    // --- Redirect with token ---
    const separator = redirect_url.includes('?') ? '&' : '?';
    return res.redirect(`${redirect_url}${separator}token=${token}`);
  } catch (err) {
    console.error('[/api/sso]', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/sso/callback?token=<jwt>
 * --------------------------------------------------
 * Purpose  : Optional SSO callback helper.
 *            Receives the token from a redirect and returns it as JSON.
 *            Useful for testing the SSO flow without a real client frontend.
 *
 * Query Params:
 *   token (string) — JWT token from the SSO redirect
 *
 * Response 200:
 *   {
 *     "message": "SSO callback received",
 *     "token":   "eyJhbGci..."
 *   }
 *
 * Response 400: Missing token
 */
router.get('/callback', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'No token received in callback.' });
  }

  return res.status(200).json({
    message: 'SSO callback received',
    token,
  });
});

module.exports = router;
