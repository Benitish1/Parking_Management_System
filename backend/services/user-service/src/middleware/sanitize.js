/*
 * middleware/sanitize.js — input sanitisation against stored/reflected XSS.
 * Runs the `xss` library over every incoming string so malicious markup
 * (e.g. <script> tags in a name field) is neutralised before it reaches the DB or responses.
 */
const xss = require('xss');

/** Recursively strip XSS payloads from request body/query/params. */
const clean = (value) => {
  if (typeof value === 'string') return xss(value); // base case: sanitise actual strings
  if (Array.isArray(value)) return value.map(clean); // recurse into each array element
  if (value && typeof value === 'object') {
    // recurse into every property of a plain object (mutates in place)
    for (const key of Object.keys(value)) value[key] = clean(value[key]);
    return value;
  }
  return value; // numbers/booleans/null pass through untouched
};

// Sanitise all three request inputs before controllers run (mounted early in app.js)
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = sanitizeMiddleware;
