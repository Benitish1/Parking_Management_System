/*
 * Error-handling middleware for the notification service.
 * Exports two pieces, both mounted LAST in app.js:
 *   - notFound: catches requests that matched no route -> 404.
 *   - errorHandler: the single place all thrown/forwarded errors funnel into,
 *     so every failure returns a consistent {success:false, message} response.
 */
const logger = require('../config/logger');
const { error } = require('../utils/response');

// Reached when no earlier route handled the request: reply with a clear 404.
const notFound = (req, res) =>
  error(res, { statusCode: 404, message: `Route not found: ${req.method} ${req.originalUrl}` });

// Express treats a 4-argument middleware (err, req, res, next) as the error handler.
// `next` is required for that signature even though it's unused here.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500; // use the error's status if set, else 500 (server fault)
  logger.error(`${status} - ${err.message} - ${req.method} ${req.originalUrl}`); // log full detail for developers
  // Hide internal 500 details from clients (don't leak stack/internals); for
  // expected errors (4xx) the message is safe to show.
  return error(res, { statusCode: status, message: status === 500 ? 'Internal server error' : err.message });
};

module.exports = { notFound, errorHandler };
