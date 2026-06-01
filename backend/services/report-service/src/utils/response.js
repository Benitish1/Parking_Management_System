/**
 * response.js — Shared {success, message, data, meta} response envelope.
 * WHY: Every microservice replies in the same shape so the React frontend can
 *      handle all responses identically. These two helpers enforce that shape.
 */
/** Standardised API response envelope used across all microservices. */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data; // only include data when there is some
  if (meta !== null) body.meta = meta; // meta carries pagination/totals when present
  return res.status(statusCode).json(body);
};

// Mirror of success() for failures: success:false plus an optional errors list.
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors; // field-level validation details, when supplied
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
