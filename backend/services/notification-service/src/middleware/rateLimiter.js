/*
 * Rate-limiting middleware for the notification service.
 * Caps how many requests one client (IP) can make in a time window, which guards
 * against abuse — important here because each request can trigger an email send.
 * Applied to the /api routes in app.js.
 */
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute rolling window
  max: 200, // at most 200 requests per IP per window
  standardHeaders: true, // send the standard RateLimit-* headers so clients can self-throttle
  legacyHeaders: false, // omit the deprecated X-RateLimit-* headers
  message: { success: false, message: 'Too many requests, please slow down.' }, // reply uses the shared envelope shape
});

module.exports = { apiLimiter };
