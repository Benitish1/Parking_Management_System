/**
 * middleware/validate.js — turns express-validator results into a 422 response.
 *
 * WHY: Routes declare validation rules (body/query checks); this runs right after
 *      them to stop the request with a clear error list if any rule failed.
 */
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/** Collects express-validator errors into a friendly 422 response. */
const validate = (req, res, next) => {
  const result = validationResult(req); // gather errors recorded by the rules on this route
  if (!result.isEmpty()) {
    // Reshape into {field, message} pairs the frontend can show next to inputs.
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors });
  }
  next(); // all rules passed — proceed to the controller
};

module.exports = validate;
