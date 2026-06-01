/*
 * middleware/rateLimiter.js — request throttling to protect the service from abuse/DoS.
 * Limits how many requests a single client (by IP) may make within a time window.
 */
const rateLimit = require('express-rate-limit');

/** General API limiter applied to all /api routes. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // rolling 15-minute window (ms)
  max: 300, // at most 300 requests per IP per window
  standardHeaders: true, // send RateLimit-* headers so clients can see their remaining quota
  legacyHeaders: false, // disable the deprecated X-RateLimit-* headers
  message: { success: false, message: 'Too many requests, please slow down.' }, // matches the response envelope
});

module.exports = { apiLimiter };
