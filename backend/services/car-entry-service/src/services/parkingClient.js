/**
 * services/parkingClient.js — HTTP client to the parking-service (port 4003).
 *
 * WHAT: Wraps the cross-service REST calls this service needs: look up a parking by
 *       code, and occupy/release a space. Every call forwards the caller's JWT.
 * WHY:  In a microservices system this service doesn't own parking data, so it asks
 *       the parking-service over HTTP. Centralising those calls (and their error
 *       handling) here keeps the controller clean and the behaviour consistent.
 */
const axios = require('axios'); // promise-based HTTP client
const logger = require('../config/logger');

// Resolved as a function (not a constant) so the env var is read at call time,
// making it easy to point at a different parking-service host per environment.
const BASE_URL = () => process.env.PARKING_SERVICE_URL || 'http://localhost:4003';

/**
 * Build axios config forwarding the caller's Authorization header.
 * This allows the parking service to authenticate/authorise the request.
 */
const cfg = (authHeader) => ({
  // Re-send the exact "Bearer <token>" the user sent us, so the parking-service
  // sees the same identity and can authorise the request (shared JWT_SECRET).
  headers: authHeader ? { Authorization: authHeader } : {},
});

/**
 * Handle axios errors into friendly application errors.
 * 4xx responses surface the parking service's message.
 * Network / 5xx errors produce a 502 Bad Gateway-style error.
 */
const handleError = (err, context) => {
  if (err.response) {
    // The parking service replied with a 4xx/5xx
    const status = err.response.status;
    const msg = err.response.data?.message || `Parking service error (${status})`;
    const e = new Error(msg);
    // Map upstream 5xx to 502 (their fault = bad gateway); pass 4xx codes through
    // so a client error there is reported as a client error here.
    e.statusCode = status >= 500 ? 502 : status;
    throw e;
  }
  // Network-level failure (ECONNREFUSED, timeout, etc.)
  logger.error(`[parkingClient] ${context}: ${err.message}`);
  const e = new Error('Parking service is unavailable. Please try again later.');
  e.statusCode = 502;
  throw e;
};

/**
 * Fetch a parking lot by its code.
 * Returns the parking data object from the service.
 */
const getByCode = async (code, authHeader) => {
  try {
    const res = await axios.get(`${BASE_URL()}/api/parkings/code/${code}`, cfg(authHeader));
    // Unwrap the {success,message,data} envelope to return just the parking object;
    // ?? res.data tolerates a service that returns the object directly.
    return res.data?.data ?? res.data;
  } catch (err) {
    handleError(err, `getByCode(${code})`);
  }
};

/**
 * Mark a parking space as occupied (called after car entry).
 */
const occupy = async (code, authHeader) => {
  try {
    // PATCH with an empty body {}; the action is the URL, no payload needed.
    const res = await axios.patch(`${BASE_URL()}/api/parkings/code/${code}/occupy`, {}, cfg(authHeader));
    return res.data?.data ?? res.data;
  } catch (err) {
    handleError(err, `occupy(${code})`);
  }
};

/**
 * Release a parking space (called after car exit).
 */
const release = async (code, authHeader) => {
  try {
    // Inverse of occupy — increments the lot's free spaces after a car exits.
    const res = await axios.patch(`${BASE_URL()}/api/parkings/code/${code}/release`, {}, cfg(authHeader));
    return res.data?.data ?? res.data;
  } catch (err) {
    handleError(err, `release(${code})`);
  }
};

module.exports = { getByCode, occupy, release };
