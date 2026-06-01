/**
 * errorHandler.js — 404 handler + central Express error handler.
 * WHY: Funnelling all errors through one place gives consistent JSON responses
 *      and one logging point, instead of try/catch repeating itself everywhere.
 */
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Reached when no earlier route matched -> tell the client which path missed.
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express identifies this as the error handler by its 4 args (err first).
// 'next' is unused but required so Express recognises the signature.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Use the error's own status if it set one, otherwise treat as 500 (server fault).
  const status = err.statusCode || err.status || 500;

  // Sequelize-specific friendly messages
  // Turn a duplicate-key DB error into a clean 409 Conflict.
  if (err.name === 'SequelizeUniqueConstraintError') {
    logger.warn(`Unique constraint: ${err.errors?.map((e) => e.message).join(', ')}`);
    return error(res, { statusCode: 409, message: 'A record with these details already exists.' });
  }
  // Turn model validation failures into a 422 with per-field details.
  if (err.name === 'SequelizeValidationError') {
    return error(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Log the full error (with stack) for debugging.
  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack || ''}`);
  // Hide internal details on 500s; surface the real message for known 4xx errors.
  return error(res, {
    statusCode: status,
    message: status === 500 ? 'Internal server error' : err.message,
  });
};

module.exports = { notFound, errorHandler };
