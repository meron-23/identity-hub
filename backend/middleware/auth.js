const { verifyToken } = require('../services/tokenService');

/**
 * Auth Middleware
 * --------------------------------------------------
 * Validates the Bearer JWT token in the Authorization header.
 * Attaches the decoded payload to req.user for downstream handlers.
 *
 * Usage: Add as second argument to any route that requires authentication.
 *   router.get('/protected', authMiddleware, handler)
 *
 * Expected Header:
 *   Authorization: Bearer <JWT_TOKEN>
 *
 * On success: calls next() with req.user = { userId, name, type, iat, exp }
 * On failure: returns 401 with error message
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};
