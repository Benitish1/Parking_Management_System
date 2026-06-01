// ---------------------------------------------------------------------------
// middleware/rateLimiter.js — Request rate limiting.
// WHAT: caps how many requests a single client (IP) can make in a time window.
// WHY:  protects the service from brute-force and denial-of-service style abuse.
// ---------------------------------------------------------------------------
const rateLimit = require('express-rate-limit');

/** Stricter limiter for sensitive endpoints — only 50 requests per 15 minutes. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,              // rolling 15-minute window
  max: 50,                               // max requests per IP in that window
  standardHeaders: true,                 // expose limit info via standard RateLimit-* headers
  legacyHeaders: false,                  // drop the deprecated X-RateLimit-* headers
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

/** General limiter applied to all /api traffic — 300 requests per 15 minutes. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,                              // more generous cap for normal API usage
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
