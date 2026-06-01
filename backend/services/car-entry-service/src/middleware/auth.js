/**
 * middleware/auth.js — JWT authentication and role-based authorization.
 *
 * WHY: All services share the same JWT_SECRET, so a token issued by the
 *      auth-service is trusted here too. authenticate proves *who* the caller is;
 *      authorize checks *what* they're allowed to do.
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/** Verify JWT from the Authorization header and attach req.user. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  // Expect the standard "Bearer <token>" format; slice off the 7-char prefix.
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return error(res, { statusCode: 401, message: 'Authentication token missing.' });

  try {
    // verifyToken throws if the signature is bad or the token expired.
    // On success the decoded payload (id, role, ...) is attached for later handlers.
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return error(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }
};

/** Restrict a route to one or more roles. */
// Higher-order middleware: call authorize('admin') to get a guard that 403s any
// user whose role isn't in the allowed list (runs after authenticate sets req.user).
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, { statusCode: 403, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
