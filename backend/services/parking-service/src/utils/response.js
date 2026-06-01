// ---------------------------------------------------------------------------
// utils/response.js — Shared helpers for the standard {success, message, data,
// meta} response envelope used by every microservice.
// WHY: one consistent JSON shape makes the frontend/clients predictable and
//      keeps controllers from hand-rolling res.status().json() everywhere.
// ---------------------------------------------------------------------------
/** Send a success response. data/meta are only included when provided (keeps payloads tidy). */
const success = (res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;   // attach payload only when there is one
  if (meta !== null) body.meta = meta;   // attach pagination/extra info only when present
  return res.status(statusCode).json(body);
};

/** Send an error response. Optional `errors` carries field-level validation details. */
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;      // include the per-field error list when supplied
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
