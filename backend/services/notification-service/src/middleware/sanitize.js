/*
 * Input-sanitizing middleware.
 * Runs incoming request bodies through the `xss` library to strip dangerous
 * HTML/script before our code uses or stores the data. This matters because
 * fields like the email subject/body can end up rendered in an email, so an
 * attacker could otherwise inject malicious markup.
 */
const xss = require('xss');

// Recursively walk any value and sanitize every string it contains.
// Handles strings, arrays, and nested objects; leaves other types (numbers,
// booleans, null) untouched.
const clean = (value) => {
  if (typeof value === 'string') return xss(value); // base case: scrub the string
  if (Array.isArray(value)) return value.map(clean); // clean each array element
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) value[key] = clean(value[key]); // clean each property in place
    return value;
  }
  return value; // non-string primitives are safe as-is
};

// Express middleware: sanitize the parsed JSON body, then continue the chain.
module.exports = (req, _res, next) => {
  if (req.body) req.body = clean(req.body); // only bodies carry user-supplied data here
  next();
};
