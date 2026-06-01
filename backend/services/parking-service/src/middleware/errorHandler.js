// ---------------------------------------------------------------------------
// middleware/errorHandler.js — Centralised 404 + error responses.
// WHAT: notFound handles unmatched routes; errorHandler is Express's final
//       error sink that turns any thrown/forwarded error into a clean JSON reply.
// WHY:  one place to map errors (incl. Sequelize's) to friendly messages and
//       status codes, and to log them, instead of repeating try/catch logic.
// ---------------------------------------------------------------------------
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Reached only when no earlier route matched -> respond 404 with the attempted method+URL
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express identifies this as the error handler by its 4 args (err, req, res, next).
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500; // use the error's status, else 500

  // Translate raw Sequelize errors into user-friendly responses:
  // a duplicate unique value (e.g. parking code) becomes a 409 Conflict
  if (err.name === 'SequelizeUniqueConstraintError') {
    logger.warn(`Unique constraint: ${err.errors?.map((e) => e.message).join(', ')}`);
    return error(res, { statusCode: 409, message: 'A record with these details already exists.' });
  }
  // model validation failures become a 422 with a per-field error list
  if (err.name === 'SequelizeValidationError') {
    return error(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Log full detail (incl. stack) for debugging
  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack || ''}`);
  return error(res, {
    statusCode: status,
    // Hide internal details on 500s; for known errors return the actual message
    message: status === 500 ? 'Internal server error' : err.message,
  });
};

module.exports = { notFound, errorHandler };
