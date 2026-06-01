/*
 * middleware/sanitize.js — Input sanitisation against XSS.
 * Runs on every request (registered in app.js) and walks the incoming data,
 * neutralising any embedded HTML/script so malicious input can't be stored
 * and later rendered in the UI.
 */
const xss = require('xss');

/** Recursively strip XSS payloads from request body/query/params. */
const clean = (value) => {
  if (typeof value === 'string') return xss(value); // escape dangerous HTML in strings
  if (Array.isArray(value)) return value.map(clean); // clean every array element
  if (value && typeof value === 'object') {
    // Walk object properties and clean each value in place
    for (const key of Object.keys(value)) value[key] = clean(value[key]);
    return value;
  }
  return value; // numbers/booleans/null pass through untouched
};

// Sanitise the three places untrusted user data can arrive before controllers see it
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = sanitizeMiddleware;
