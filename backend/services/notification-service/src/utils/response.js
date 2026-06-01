/*
 * Response helpers — enforce ONE consistent JSON shape across every endpoint.
 * Every service in the system replies with the {success, message, data/errors}
 * envelope, so the frontend can handle all responses the same way. Using these
 * helpers everywhere means no handler has to hand-build that shape.
 */

// Build a success response. statusCode/message/data are optional with sensible
// defaults; data is only included when actually provided (keeps payloads clean).
const success = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data; // omit `data` entirely when there's nothing to return
  return res.status(statusCode).json(body);
};

// Build an error response. Defaults to 500; `errors` (e.g. a validation list) is
// attached only when present so simple errors stay minimal.
const error = (res, { statusCode = 500, message = 'Something went wrong', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors) body.errors = errors; // include field-level details only if given
  return res.status(statusCode).json(body);
};

module.exports = { success, error };
