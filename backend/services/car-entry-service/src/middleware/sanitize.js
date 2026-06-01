/**
 * middleware/sanitize.js — strips XSS payloads from all incoming request data.
 *
 * WHY: User input (plate numbers, search terms, etc.) is stored and later shown;
 *      cleaning it on the way in prevents stored cross-site-scripting attacks.
 */
const xss = require('xss');

/** Recursively strip XSS payloads from request body/query/params. */
// Recurses because input can be nested (arrays / objects), not just flat strings.
const clean = (value) => {
  if (typeof value === 'string') return xss(value); // neutralise <script> etc. in strings
  if (Array.isArray(value)) return value.map(clean); // clean each array element
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = clean(value[key]); // clean each property
    return value;
  }
  return value; // numbers/booleans/null pass through untouched
};

// Sanitise every part of the request a client can control, before validators/handlers run.
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = sanitizeMiddleware;
