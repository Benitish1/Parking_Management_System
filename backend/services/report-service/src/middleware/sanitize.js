/**
 * sanitize.js — Input sanitisation middleware against XSS.
 * WHY: Even though this service mostly reads dates, any string a client sends
 *      could carry a script payload that ends up rendered later; cleaning it at
 *      the edge keeps stored/echoed data safe.
 */
const xss = require('xss');

/** Recursively strip XSS payloads from request body/query/params. */
// Recurses so nested objects and arrays are cleaned too, not just top-level strings.
const clean = (value) => {
  if (typeof value === 'string') return xss(value); // neutralise <script> etc. in strings
  if (Array.isArray(value)) return value.map(clean); // clean each array element
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = clean(value[key]); // clean each property
    return value;
  }
  return value; // numbers/booleans/null pass through untouched
};

// Sanitise all three request input sources before they reach the controllers.
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = sanitizeMiddleware;
