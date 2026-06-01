// ---------------------------------------------------------------------------
// middleware/auth.js — Authentication & authorization guards.
// WHAT: authenticate() proves WHO the caller is (valid JWT); authorize() checks
//       WHAT they're allowed to do (role). Together they protect routes.
// WHY:  the same JWT_SECRET is shared across all services, so a token minted by
//       the auth-service is trusted here without an extra network call.
// ---------------------------------------------------------------------------
const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

/** Verify the JWT from the "Authorization: Bearer <token>" header and attach the
 *  decoded payload to req.user so downstream handlers know who is calling. */
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  // Pull the raw token out, stripping the "Bearer " prefix (7 chars); null if not present/correct
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return error(res, { statusCode: 401, message: 'Authentication token missing.' });

  try {
    req.user = verifyToken(token);       // throws if signature is wrong or token expired
    next();                              // valid token -> continue to the next handler
  } catch (err) {
    return error(res, { statusCode: 401, message: 'Invalid or expired token.' });
  }
};

/** Restrict a route to specific role(s) (e.g. authorize('admin')).
 *  Returns a middleware so roles can be passed in per-route. Must run AFTER authenticate. */
const authorize = (...roles) => (req, res, next) => {
  // 403 Forbidden if there's no authenticated user or their role isn't in the allowed list
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, { statusCode: 403, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
