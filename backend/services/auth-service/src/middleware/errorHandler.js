/*
 * middleware/errorHandler.js — Central 404 + error handling for the service.
 * Registered LAST in app.js. `notFound` catches unmatched routes; `errorHandler`
 * turns any thrown/forwarded error into a consistent error envelope and logs it,
 * translating common Sequelize errors into friendly HTTP statuses.
 */
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Reached when no route matched — return a clear 404 with the attempted method/URL
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express recognises this as the error handler because it takes 4 args (err, req, res, next)
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500; // use the error's status, else default to 500

  // Sequelize-specific friendly messages
  // Duplicate value on a unique column (e.g. email already taken) -> 409 Conflict
  if (err.name === 'SequelizeUniqueConstraintError') {
    logger.warn(`Unique constraint: ${err.errors?.map((e) => e.message).join(', ')}`);
    return error(res, { statusCode: 409, message: 'A record with these details already exists.' });
  }
  // Model-level validation failure -> 422 with per-field details
  if (err.name === 'SequelizeValidationError') {
    return error(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  // Log full details (including stack) for debugging, then respond
  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack || ''}`);
  return error(res, {
    statusCode: status,
    message: status === 500 ? 'Internal server error' : err.message, // hide internal details on 500s
  });
};

module.exports = { notFound, errorHandler };
