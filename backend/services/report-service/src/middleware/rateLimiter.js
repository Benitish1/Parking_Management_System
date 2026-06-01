/**
 * rateLimiter.js — Request throttling middleware.
 * WHY: Report queries are heavy DB aggregations, so capping requests per client
 *      protects the shared database from accidental or malicious flooding.
 */
const rateLimit = require('express-rate-limit');

/** General API limiter for report endpoints. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // rolling 15-minute window
  max: 300, // at most 300 requests per IP per window
  standardHeaders: true, // expose limit info via standard RateLimit-* headers
  legacyHeaders: false, // drop the deprecated X-RateLimit-* headers
  // Response sent once the limit is exceeded (matches our {success,message} envelope).
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { apiLimiter };
