/*
 * middleware/rateLimiter.js — Request rate limiters (express-rate-limit).
 * Caps how many requests a client (by IP) may make in a time window to defend
 * against brute-force and abuse. `authLimiter` is strict for auth endpoints;
 * `apiLimiter` is a looser cap applied to all /api traffic.
 */
const rateLimit = require('express-rate-limit');

/** Aggressive limiter for auth-sensitive endpoints (login, signup, otp). */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 50, // max 50 auth attempts per IP per window (slows password/OTP guessing)
  standardHeaders: true, // expose limit info via standard RateLimit-* headers
  legacyHeaders: false, // disable the old X-RateLimit-* headers
  message: { success: false, message: 'Too many attempts, please try again later.' },
});

/** General API limiter. */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15-minute window
  max: 300, // higher cap for normal traffic
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
