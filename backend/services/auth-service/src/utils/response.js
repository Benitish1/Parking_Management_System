/*
 * utils/response.js — Helpers that enforce ONE consistent JSON shape for every
 * reply across all microservices: { success, message, data?, meta?/errors? }.
 * Using these everywhere means the React client can parse responses uniformly.
 */
/** Standardised API response envelope used across all microservices. */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data; // only attach data when there is some
  if (meta !== null) body.meta = meta; // optional metadata (e.g. pagination)
  return res.status(statusCode).json(body);
};

// Mirror of success() for failures: success:false plus an optional field-level errors list
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors; // include validation/detail errors when provided
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
