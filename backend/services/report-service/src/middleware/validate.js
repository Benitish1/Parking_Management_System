/**
 * validate.js — Bridges express-validator results into our error envelope.
 * WHY: The route files declare validation rules (e.g. from/to must be ISO dates);
 *      this middleware runs AFTER those rules and stops the request with a clear
 *      422 if any failed, so controllers can assume inputs are already valid.
 */
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/** Collects express-validator errors into a friendly 422 response. */
const validate = (req, res, next) => {
  const result = validationResult(req); // gather errors the rule chain recorded
  if (!result.isEmpty()) {
    // Reshape into a simple [{ field, message }] list for the client.
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors });
  }
  next(); // all rules passed -> continue to the controller
};

module.exports = validate;
