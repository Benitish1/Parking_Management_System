/*
 * middleware/errorHandler.js — central 404 + error handling for the service.
 * notFound runs when no route matched; errorHandler is Express's error middleware
 * (4 args) that catches everything passed to next(err) and turns it into a clean,
 * consistent JSON error response.
 */
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Catch-all for unmatched routes — mounted after all real routes in app.js
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// The 4-argument signature (err first) is how Express recognises this as the error handler.
// `next` is unused but required to keep that signature, hence the eslint-disable.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500; // use the error's own status if it set one, else 500

  // Sequelize-specific friendly messages — translate DB errors into clean client responses
  if (err.name === 'SequelizeUniqueConstraintError') {
    // e.g. duplicate email at the DB level; log details but return a generic 409 (don't leak DB internals)
    logger.warn(`Unique constraint: ${err.errors?.map((e) => e.message).join(', ')}`);
    return error(res, { statusCode: 409, message: 'A record with these details already exists.' });
  }
  if (err.name === 'SequelizeValidationError') {
    // Model-level validation failed — return 422 with per-field messages so the client can highlight inputs
    return error(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Log the full error + stack for debugging (server-side only)
  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack || ''}`);
  return error(res, {
    statusCode: status,
    // Hide internal details on 500s (avoid leaking stack/secret info); surface the real message for 4xx
    message: status === 500 ? 'Internal server error' : err.message,
  });
};

module.exports = { notFound, errorHandler };
