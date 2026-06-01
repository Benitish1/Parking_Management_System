/**
 * utils/response.js — helpers for the shared {success, message, data, meta} envelope.
 *
 * WHY: Every XWZ service replies in the same JSON shape, so the frontend can handle
 *      all responses uniformly. These two helpers guarantee that consistency.
 */

/** Standardised API response envelope used across all microservices. */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const body = { success: true, message };
  // Only attach data/meta when provided, keeping responses lean (e.g. meta is for pagination).
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(statusCode).json(body);
};

// Error counterpart: success:false plus an optional `errors` array (e.g. field validation details).
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
