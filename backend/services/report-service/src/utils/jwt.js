/**
 * jwt.js — Thin wrapper around jsonwebtoken.
 * WHY: All services share the SAME JWT_SECRET, so a token signed by the
 *      auth-service verifies cleanly here. Centralising sign/verify keeps the
 *      secret and expiry settings in one place.
 */
const jwt = require('jsonwebtoken');

// Sign a payload into a token; default 1-day expiry unless overridden by env.
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// Verify signature + expiry and return the decoded payload; throws if invalid.
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
