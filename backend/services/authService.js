const { createToken } = require('./tokenService');

/**
 * generateAuthToken
 * Issues a short-lived JWT used for API access after face authentication.
 *
 * Payload: { userId, name, type: 'auth' }
 * Expires: 1 hour
 *
 * @param {string} userId
 * @param {string} name
 * @returns {string} signed JWT
 */
const generateAuthToken = (userId, name) => {
  return createToken({ userId, name, type: 'auth' });
};

/**
 * generateCredentialToken
 * Issues a signed verifiable credential JWT — acts as proof of identity.
 *
 * Payload: { sub: userId, name, verified, type: 'credential', iss: 'identity-hub' }
 * Expires: 24 hours (overridden inside)
 *
 * This is a separate concern from the auth token: it is meant to be
 * shared with third-party services as proof of eKYC completion.
 *
 * @param {string} userId
 * @param {string} name
 * @param {boolean} verified
 * @returns {string} signed JWT credential
 */
const generateCredentialToken = (userId, name, verified) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    {
      sub: userId,
      name,
      verified,
      type: 'credential',
      iss: 'identity-hub',
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

module.exports = { generateAuthToken, generateCredentialToken };
