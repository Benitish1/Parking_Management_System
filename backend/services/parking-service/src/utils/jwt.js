// ---------------------------------------------------------------------------
// utils/jwt.js — Thin wrapper around jsonwebtoken for signing/verifying tokens.
// WHY: every service shares the same JWT_SECRET, so a token signed anywhere in
//      the system can be verified here — enabling stateless cross-service auth.
// ---------------------------------------------------------------------------
const jwt = require('jsonwebtoken');

// Create a signed token from a payload; expires after JWT_EXPIRES_IN (default 1 day)
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// Verify a token's signature/expiry; returns the decoded payload or THROWS if invalid/expired
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
