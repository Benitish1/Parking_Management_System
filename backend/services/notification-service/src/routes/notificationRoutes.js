/*
 * Routes for the notification service, mounted under /api/notifications (see app.js).
 * Each route defines: the HTTP method + path, the validation rules, the validate
 * middleware that enforces them, and finally the controller that does the work.
 * The @swagger comment blocks below document each endpoint and are read by
 * swagger-jsdoc to generate the /docs page.
 */
const express = require('express');
const { body } = require('express-validator'); // helpers to declare body-field validation rules
const ctrl = require('../controllers/notificationController'); // the handlers that send the emails
const validate = require('../middleware/validate'); // checks the rules and blocks bad requests with 422

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: OTP and transactional email delivery (called by other services)
 */

/**
 * @swagger
 * /api/notifications/otp:
 *   post:
 *     summary: Send a 6-digit OTP email
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, otp]
 *             properties:
 *               to:      { type: string, example: alice@xwz.rw }
 *               name:    { type: string, example: Alice }
 *               otp:     { type: string, example: "123456" }
 *               purpose: { type: string, example: Account Verification }
 *     responses:
 *       200: { description: OTP email processed }
 */
// Send an OTP email. Require a valid recipient email and a non-empty OTP code;
// validate enforces those rules before sendOtp runs.
router.post(
  '/otp',
  [body('to').isEmail(), body('otp').notEmpty()], // validation rules for this endpoint
  validate, // reject the request with 422 if a rule failed
  ctrl.sendOtp // otherwise build + send the OTP email
);

/**
 * @swagger
 * /api/notifications/email:
 *   post:
 *     summary: Send a generic transactional email
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject]
 *             properties:
 *               to:      { type: string }
 *               subject: { type: string }
 *               html:    { type: string }
 *               text:    { type: string }
 *     responses:
 *       200: { description: Email processed }
 */
// Send a generic transactional email. Require a valid recipient and a subject;
// the body (html/text) is optional and supplied by the caller.
router.post(
  '/email',
  [body('to').isEmail(), body('subject').notEmpty()], // validation rules for this endpoint
  validate, // block invalid input before the controller
  ctrl.sendEmail
);

module.exports = router;
