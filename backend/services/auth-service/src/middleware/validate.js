/*
 * middleware/validate.js — express-validator result checker.
 * Route files attach validation rules (e.g. body('email').isEmail()); this
 * middleware runs AFTER those rules and short-circuits with a 422 if any failed,
 * so controllers only ever run on well-formed input.
 */
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/** Collects express-validator errors into a friendly 422 response. */
const validate = (req, res, next) => {
  const result = validationResult(req); // gather any errors recorded by the rule chain
  if (!result.isEmpty()) {
    // Reshape into a tidy [{field, message}] list for the client
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors });
  }
  next(); // input is valid — continue to the controller
};

module.exports = validate;
