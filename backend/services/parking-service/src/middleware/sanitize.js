// ---------------------------------------------------------------------------
// middleware/sanitize.js — Input sanitisation against XSS.
// WHAT: scrubs malicious HTML/script payloads out of every incoming request.
// WHY:  defence-in-depth — stops stored/reflected XSS even if other layers miss it.
// ---------------------------------------------------------------------------
const xss = require('xss');

/** Recursively clean a value: sanitise strings, walk arrays and objects.
 *  Recursion is needed because request data can be deeply nested. */
const clean = (value) => {
  if (typeof value === 'string') return xss(value);      // neutralise dangerous markup in strings
  if (Array.isArray(value)) return value.map(clean);     // clean each array element
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = clean(value[key]); // clean each property in place
    return value;
  }
  return value;                                          // numbers/booleans/null pass through unchanged
};

// Sanitise the three places user input arrives before any controller runs
const sanitizeMiddleware = (req, _res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};

module.exports = sanitizeMiddleware;
