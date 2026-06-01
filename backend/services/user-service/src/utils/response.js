/*
 * utils/response.js — helpers that enforce the shared {success, message, data, meta} envelope.
 * Using these everywhere keeps every microservice's JSON shape consistent for the frontend.
 */

/** Standardised API response envelope used across all microservices. */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data; // only attach data when there is some (omit on e.g. delete)
  if (meta !== null) body.meta = meta; // only attach meta when present (e.g. pagination info on lists)
  return res.status(statusCode).json(body);
};

// Mirror of success() for failures; optional `errors` array carries per-field validation details
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
