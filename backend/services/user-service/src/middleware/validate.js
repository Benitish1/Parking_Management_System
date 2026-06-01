/*
 * middleware/validate.js — bridges express-validator with our response envelope.
 * The route's validation rules (body/query/param checks) record any failures on the request;
 * this middleware reads them and either rejects with a 422 or lets the request continue.
 */
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

/** Collects express-validator errors into a friendly 422 response. */
const validate = (req, res, next) => {
  const result = validationResult(req); // gather everything the rule chain flagged
  if (!result.isEmpty()) {
    // Reshape into [{field, message}] so the client knows exactly which input failed and why
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors }); // 422 = unprocessable entity
  }
  next(); // all rules passed — proceed to the controller
};

module.exports = validate;
