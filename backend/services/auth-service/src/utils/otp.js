/*
 * utils/otp.js — Helpers for one-time-password (OTP) email verification.
 * generateOtp() makes the 6-digit code; otpExpiry() computes when it lapses.
 * Used by the controller during signup and resend-otp.
 */
/** Generate a cryptographically-random 6-digit OTP code. */
const crypto = require('crypto'); // use crypto (not Math.random) so codes aren't predictable

const generateOtp = () => {
  // 0 - 999999, zero-padded to 6 digits
  const n = crypto.randomInt(0, 1000000); // secure random int in [0, 999999]
  return String(n).padStart(6, '0'); // pad so e.g. 42 becomes "000042" — always 6 chars
};

// Return a Date `minutes` from now; stored on the user as otpExpiresAt to enforce a time limit
const otpExpiry = (minutes = 10) => new Date(Date.now() + minutes * 60 * 1000);

module.exports = { generateOtp, otpExpiry };
