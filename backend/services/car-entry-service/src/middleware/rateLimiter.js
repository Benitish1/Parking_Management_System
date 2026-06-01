/**
 * middleware/rateLimiter.js — request throttling via express-rate-limit.
 *
 * WHY: Caps how many requests one client (by IP) can make in a time window to
 *      protect the service from brute-force and accidental floods.
 */
const rateLimit = require('express-rate-limit');

/** Aggressive limiter for sensitive write endpoints. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute rolling window
  max: 50, // at most 50 requests per IP per window (tight, for sensitive routes)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

/** General API limiter. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // same 15-minute window
  max: 300, // more generous cap for normal read/write API traffic
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
