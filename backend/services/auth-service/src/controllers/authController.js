/*
 * controllers/authController.js — Core business logic of the auth-service.
 * Implements the request handlers used by authRoutes.js:
 *   signup      -> create user + generate OTP + email it
 *   verifyOtp   -> validate OTP, mark verified, AND auto-login (issue JWT)
 *   resendOtp   -> issue a fresh OTP for an unverified account
 *   login       -> check credentials, refuse unverified users, issue JWT
 *   me          -> return the currently authenticated user's profile
 * All responses use the shared {success, message, data} envelope.
 */
const axios = require('axios'); // used to call the notification-service over HTTP
const User = require('../models/User');
const { signToken } = require('../utils/jwt'); // creates signed JWTs
const { generateOtp, otpExpiry } = require('../utils/otp'); // OTP code + expiry helpers
const { success, error } = require('../utils/response'); // standard response envelope helpers
const logger = require('../config/logger');

// Base URL of the notification-service that actually sends the OTP email
const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006';

/** Fire-and-(soft)forget OTP email via the Notification microservice. */
async function dispatchOtp(user, purpose = 'Account Verification') {
  try {
    // Ask the notification-service to email the OTP; 8s timeout avoids hanging the request
    await axios.post(`${NOTIFICATION_URL}/api/notifications/otp`, {
      to: user.email,
      name: user.firstName,
      otp: user.otpCode,
      purpose,
    }, { timeout: 8000 });
    logger.info(`OTP dispatched to ${user.email} via notification-service`);
  } catch (err) {
    // Don't break signup if email service is down — log + surface OTP in dev.
    // Signup still succeeds; the user can use resend-otp once email is back up.
    logger.warn(`Notification-service unreachable (${err.message}). Dev OTP for ${user.email}: ${user.otpCode}`);
  }
}

// Whitelist the safe public fields of a user — never leak password/otp to clients
const sanitizeUser = (u) => ({
  id: u.id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  role: u.role,
  isVerified: u.isVerified,
  createdAt: u.createdAt,
});

// POST /api/auth/signup
// Registers a new (unverified) user, generates a 6-digit OTP and emails it.
exports.signup = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // Reject duplicate emails up front (409) for a clear, friendly message
    const existing = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existing) {
      return error(res, { statusCode: 409, message: 'An account with this email already exists.' });
    }

    const otpCode = generateOtp(); // random 6-digit verification code
    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // stored as-is here; the model's beforeSave hook hashes it with bcrypt
      role: role === 'admin' ? 'admin' : 'attendant', // only allow these two roles; default to attendant
      otpCode,
      otpExpiresAt: otpExpiry(10), // code valid for 10 minutes
      isVerified: false, // account stays locked until OTP is verified
    });

    await dispatchOtp(user); // send the OTP email (non-blocking on failure)
    logger.info(`New signup: ${user.email} (${user.role})`);

    // 201 Created — return only the email; do NOT return the OTP in the response
    return success(res, {
      statusCode: 201,
      message: 'Account created. A 6-digit verification code has been sent to your email.',
      data: { email: user.email },
    });
  } catch (err) {
    next(err); // hand any unexpected error to the central errorHandler
  }
};

// POST /api/auth/verify-otp
// Confirms the emailed OTP, activates the account, then auto-logs the user in.
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    // 'withSecret' scope is needed so otpCode/otpExpiresAt (hidden by default) are loaded
    const user = await User.scope('withSecret').findOne({ where: { email: email.toLowerCase() } });
    if (!user) return error(res, { statusCode: 404, message: 'No account found for this email.' });
    if (user.isVerified) return error(res, { statusCode: 400, message: 'Account is already verified. Please log in.' });

    // Reject if no code on record or it doesn't match what the user submitted
    if (!user.otpCode || user.otpCode !== otp) {
      return error(res, { statusCode: 400, message: 'Invalid verification code.' });
    }
    // Reject expired codes (older than the 10-minute window set at signup/resend)
    if (new Date() > new Date(user.otpExpiresAt)) {
      return error(res, { statusCode: 400, message: 'Verification code has expired. Please request a new one.' });
    }

    user.isVerified = true; // unlock the account
    user.otpCode = null; // clear the one-time code so it can't be reused
    user.otpExpiresAt = null;
    await user.save();
    logger.info(`Account verified: ${user.email}`);

    // Auto-login: issue a JWT so the client lands on the dashboard, not the login page.
    const token = signToken({ id: user.id, email: user.email, role: user.role }); // payload identifies the user + role for authorisation
    return success(res, {
      message: 'Account verified successfully.',
      data: { token, user: sanitizeUser(user) }, // token + safe user fields for the client to store
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/resend-otp
// Generates and emails a brand-new OTP for an account that isn't verified yet.
exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    // withSecret scope so we can write the new otpCode/otpExpiresAt fields
    const user = await User.scope('withSecret').findOne({ where: { email: email.toLowerCase() } });
    if (!user) return error(res, { statusCode: 404, message: 'No account found for this email.' });
    if (user.isVerified) return error(res, { statusCode: 400, message: 'Account is already verified.' });

    user.otpCode = generateOtp(); // fresh code replaces any previous one
    user.otpExpiresAt = otpExpiry(10); // reset the 10-minute expiry window
    await user.save();
    await dispatchOtp(user, 'New Verification Code'); // re-send via notification-service

    return success(res, {
      message: 'A new verification code has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login  — OTP is NOT required at login (only after signup)
// Validates credentials, blocks unverified accounts, and returns a JWT on success.
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // withSecret scope so the hashed password is available for comparison
    const user = await User.scope('withSecret').findOne({ where: { email: email.toLowerCase() } });

    // Same generic 401 whether the email is unknown or the password is wrong (avoids leaking which)
    if (!user || !(await user.comparePassword(password))) {
      logger.warn(`Failed login attempt for ${email}`);
      return error(res, { statusCode: 401, message: 'Invalid email or password.' });
    }
    // Unverified users must complete OTP first; flag lets the UI redirect to verify screen
    if (!user.isVerified) {
      return error(res, { statusCode: 403, message: 'Please verify your account before logging in.', errors: { needsVerification: true } });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role }); // sign JWT carrying id/email/role
    logger.info(`Login success: ${user.email} (${user.role})`);

    return success(res, {
      message: 'Login successful.',
      data: { token, user: sanitizeUser(user) },
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me  — protected
// Returns the profile of whoever owns the JWT (authenticate middleware sets req.user).
exports.me = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id); // look up by the id embedded in the verified token
    if (!user) return error(res, { statusCode: 404, message: 'User not found.' });
    return success(res, { message: 'Current user', data: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
};
