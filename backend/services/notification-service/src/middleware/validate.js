/*
 * Validation-result middleware.
 * The route files declare validation RULES (e.g. body('to').isEmail()); those
 * rules just record any problems on the request. This middleware then CHECKS
 * those recorded results and, if anything failed, stops the request with a 422
 * before it ever reaches the controller. Place it right after the rule array.
 */
const { validationResult } = require('express-validator');
const { error } = require('../utils/response');

module.exports = (req, res, next) => {
  const result = validationResult(req); // gather any validation errors the rules recorded
  if (!result.isEmpty()) {
    // Reshape express-validator's output into a tidy [{field, message}] list for the client.
    const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
    return error(res, { statusCode: 422, message: 'Validation failed', errors }); // 422 = Unprocessable Entity
  }
  next(); // input is valid — proceed to the controller
};
