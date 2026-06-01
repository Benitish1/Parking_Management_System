/*
 * middleware/auth.js — JWT authentication + role authorization.
 * authenticate() proves WHO the caller is (valid token => req.user); authorize() then
 * checks WHAT they're allowed to do (role). The same JWT_SECRET is shared across all
 * services, so a token minted by the auth-service is trusted here too.
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/** Verify JWT from the Authorization header and attach req.user. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  // Expect the standard "Bearer <token>" scheme; slice(7) drops the "Bearer " prefix
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return error(res, { statusCode: 401, message: 'Authentication token missing.' }); // 401 = not authenticated

  try {
    req.user = verifyToken(token); // decoded payload (id, role, ...) becomes available to later handlers
    next();
  } catch (err) {
    // verifyToken throws on a bad signature or expired token — treat both as unauthenticated
    return error(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }
};

/**
 * Restrict a route to one or more roles.
 * Returns a middleware closure that remembers the allowed roles (e.g. authorize('admin')).
 * Must run AFTER authenticate so req.user exists.
 */
const authorize = (...roles) => (req, res, next) => {
  // Reject if not logged in OR the user's role isn't in the allowed list — 403 = authenticated but not permitted
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, { statusCode: 403, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
