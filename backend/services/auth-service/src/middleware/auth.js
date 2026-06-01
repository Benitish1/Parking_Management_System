/*
 * middleware/auth.js — JWT guard middleware for protected routes.
 * `authenticate` proves WHO the caller is (valid token), `authorize` checks
 * WHAT they're allowed to do (role-based). The same JWT_SECRET is shared by all
 * microservices, so a token issued here is trusted across the whole system.
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/** Verify JWT from the Authorization header and attach req.user. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  // Expect the standard "Bearer <token>" format; slice(7) drops the "Bearer " prefix
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return error(res, { statusCode: 401, message: 'Authentication token missing.' });

  try {
    req.user = verifyToken(token); // decoded payload (id/email/role) becomes available to controllers
    next();
  } catch (err) {
    // verifyToken throws on a tampered/expired/invalid signature
    return error(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }
};

/** Restrict a route to one or more roles. */
// Usage: authorize('admin') — only runs next() if req.user.role is in the allowed list
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, { statusCode: 403, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
