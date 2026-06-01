// ---------------------------------------------------------------------------
// middleware/validate.js — Validation-result checker.
// WHAT: runs after the express-validator rule chains on a route and turns any
//       collected validation errors into a single 422 response.
// WHY:  keeps each route's validation rules declarative; this one helper reports
//       the failures consistently across all endpoints.
// ---------------------------------------------------------------------------
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/** Collects express-validator errors into a friendly 422 response. */
const validate = (req, res, next) => {
  const result = validationResult(req);  // gather errors the rule chains recorded on this request
  if (!result.isEmpty()) {
    // Reshape into a tidy {field, message} list for the client
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors }); // 422 Unprocessable Entity
  }
  next();                                // no errors -> proceed to the controller
};

module.exports = validate;
