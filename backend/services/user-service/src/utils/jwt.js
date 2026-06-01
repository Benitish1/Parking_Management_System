/*
 * utils/jwt.js — thin wrapper around jsonwebtoken.
 * The SAME JWT_SECRET is shared by all microservices, so tokens signed anywhere
 * (typically by the auth-service) can be verified here. Keeping sign/verify in one
 * place ensures every service uses identical settings.
 */
const jwt = require('jsonwebtoken');

// Create a signed token from a payload (e.g. { id, role }); expires after JWT_EXPIRES_IN (default 1 day)
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// Verify signature + expiry and return the decoded payload; THROWS if invalid/expired (caller handles it)
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
