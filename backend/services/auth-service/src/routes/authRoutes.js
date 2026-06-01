/*
 * routes/authRoutes.js — Defines all /api/auth endpoints and their pipelines.
 * Each route chains: rate limiter -> validation rules -> validate -> controller.
 * The /** @swagger ... *​/ blocks document the API for Swagger and must stay intact.
 */
const express = require('express');
const { body } = require('express-validator'); // request-body validation rules
const ctrl = require('../controllers/authController'); // route handlers
const validate = require('../middleware/validate'); // turns validation failures into 422s
const { authenticate } = require('../middleware/auth'); // JWT guard for protected routes
const { authLimiter } = require('../middleware/rateLimiter'); // strict limiter for auth endpoints

const router = express.Router();

// Reusable password policy applied on signup: length + upper/lower/number complexity
const passwordRule = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Signup, OTP verification, login and JWT issuing
 */

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Register a new user and send a 6-digit OTP by email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, role]
 *             properties:
 *               firstName: { type: string, example: Alice }
 *               lastName:  { type: string, example: Mukamana }
 *               email:     { type: string, example: alice@xwz.rw }
 *               password:  { type: string, example: Passw0rd! }
 *               role:      { type: string, enum: [admin, attendant], example: attendant }
 *     responses:
 *       201: { description: Account created, OTP sent }
 *       409: { description: Email already exists }
 *       422: { description: Validation error }
 */
// Signup: validate all fields, then create the account + send OTP
router.post(
  '/signup',
  authLimiter,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
    passwordRule,
    body('role').optional().isIn(['admin', 'attendant']).withMessage('Role must be admin or attendant'),
  ],
  validate,
  ctrl.signup
);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify the 6-digit OTP and activate the account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email: { type: string, example: alice@xwz.rw }
 *               otp:   { type: string, example: "123456" }
 *     responses:
 *       200: { description: Account verified }
 *       400: { description: Invalid or expired OTP }
 */
// Verify OTP: require a 6-digit code, then activate the account and auto-login
router.post(
  '/verify-otp',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
  ],
  validate,
  ctrl.verifyOtp
);

/**
 * @swagger
 * /api/auth/resend-otp:
 *   post:
 *     summary: Resend a fresh OTP code
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200: { description: New OTP sent }
 */
// Resend OTP: generate and email a fresh code for an unverified account
router.post('/resend-otp', authLimiter, [body('email').isEmail().normalizeEmail()], validate, ctrl.resendOtp);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate and receive a JWT (no OTP required at login)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, example: admin@xwz.rw }
 *               password: { type: string, example: Admin123! }
 *     responses:
 *       200: { description: Login success, returns token + user }
 *       401: { description: Invalid credentials }
 *       403: { description: Account not verified }
 */
// Login: validate credentials present, then authenticate and issue a JWT
router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  validate,
  ctrl.login
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get the currently authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user profile }
 *       401: { description: Unauthorized }
 */
// Me: protected — `authenticate` must verify the JWT before the handler runs
router.get('/me', authenticate, ctrl.me);

module.exports = router;
