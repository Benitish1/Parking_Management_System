/*
 * utils/jwt.js — Thin wrapper around jsonwebtoken for issuing/checking tokens.
 * JWT_SECRET is shared by every microservice, so a token signed here is accepted
 * across the whole system (gateway, parking, report, etc.) without re-login.
 */
const jwt = require('jsonwebtoken');

// Create a signed token from a payload (id/email/role); expires after JWT_EXPIRES_IN (default 1 day)
const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

// Verify signature + expiry; returns the decoded payload, or THROWS if invalid/expired
const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
