/**
 * utils/jwt.js — thin wrapper around jsonwebtoken for signing/verifying tokens.
 *
 * WHY: Every service uses the SAME JWT_SECRET, so a token signed anywhere in the
 *      XWZ system verifies here. Centralising secret/expiry config avoids repeating
 *      it across the codebase.
 */
const jwt = require('jsonwebtoken');

// Create a signed token from a payload (e.g. user id + role), expiring after JWT_EXPIRES_IN.
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// Verify signature + expiry and return the decoded payload; throws if invalid/expired.
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
