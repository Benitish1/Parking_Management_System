/**
 * middleware/errorHandler.js — centralised 404 + error responses.
 *
 * WHY: A single place to turn unmatched routes and thrown errors into the
 *      standard {success:false,...} envelope, so handlers can just call next(err).
 */
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Reached only when no route matched — return a 404 describing the attempted route.
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express identifies this as the error handler by its 4 args (err first); `next`
// is unused but required for that signature, hence the eslint-disable.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Use the error's own status if set, otherwise treat it as a 500 server error.
  const status = err.statusCode || err.status || 500;

  // Sequelize-specific friendly messages
  // Translate DB-level errors into user-friendly messages + correct HTTP codes.
  if (err.name === 'SequelizeUniqueConstraintError') {
    logger.warn(`Unique constraint: ${err.errors?.map((e) => e.message).join(', ')}`);
    return error(res, { statusCode: 409, message: 'A record with these details already exists.' });
  }
  if (err.name === 'SequelizeValidationError') {
    // Flatten model validation failures into a field/message list (422 Unprocessable).
    return error(res, {
      statusCode: 422,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}\n${err.stack || ''}`);
  // Hide internal details on 500s; pass through our own intentional messages otherwise.
  return error(res, {
    statusCode: status,
    message: status === 500 ? 'Internal server error' : err.message,
  });
};

module.exports = { notFound, errorHandler };
