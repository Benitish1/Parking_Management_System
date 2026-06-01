/**
 * auth.js — Authentication & authorisation middleware.
 * WHY: Report data is admin-only, so every route must (1) prove WHO the caller
 *      is via a JWT, then (2) check they have the right role. The shared
 *      JWT_SECRET lets a token minted by the auth-service be trusted here too.
 */
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/** Verify JWT from the Authorization header and attach req.user. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  // Expect "Bearer <token>"; slice(7) drops the "Bearer " prefix to get the raw token.
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return error(res, { statusCode: 401, message: 'Authentication token missing.' });

  try {
    // Decode + verify the signature/expiry, then stash the payload for later middleware.
    req.user = verifyToken(token);
    next();
  } catch (err) {
    // verifyToken throws on bad signature or expiry -> treat as unauthenticated.
    return error(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }
};

/** Restrict a route to one or more roles. */
// Higher-order: authorize('admin') returns the actual middleware. 403 if the
// authenticated user's role isn't in the allowed list.
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, { statusCode: 403, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
