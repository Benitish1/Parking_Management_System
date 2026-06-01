/*
 * routes/userRoutes.js — defines the /api/users endpoints and their request pipeline.
 * Each route runs: validation rules -> validate (reject bad input) -> controller.
 * The @swagger JSDoc blocks below document the API for the /docs page (do not edit them).
 */
const { Router } = require('express');
const { body, query, param } = require('express-validator'); // builders for input validation rules

const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getStats,
} = require('../controllers/userController');

const router = Router();

// Gate EVERY route in this file: must be authenticated AND have the 'admin' role.
// Applied once here (router.use) so individual routes below don't repeat the check.
router.use(authenticate, authorize('admin'));

/* ------------------------------------------------------------------ */
/* Validation rule sets                                                 */
/* ------------------------------------------------------------------ */

// Rules for POST /api/users — all fields required; password must meet complexity policy
const createRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password')
    // enforce min length plus upper/lower/number so created accounts have strong passwords
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.'),
  body('role').isIn(['admin', 'attendant']).withMessage('Role must be admin or attendant.'),
];

// Rules for PUT /api/users/:id — every field optional() since this is a partial update
const updateRules = [
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty.'),
  body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty.'),
  body('role').optional().isIn(['admin', 'attendant']).withMessage('Role must be admin or attendant.'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean.'),
];

// Rules for the list query string — validates/limits pagination + role filter inputs
const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  query('role').optional().isIn(['admin', 'attendant']).withMessage('role must be admin or attendant.'),
];

// Reusable rule for any route with an :id path param — must be a valid UUID
const idParam = [
  param('id').isUUID().withMessage('id must be a valid UUID.'),
];

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Admin user management
 */

/**
 * @swagger
 * /api/users/stats/summary:
 *   get:
 *     summary: Get user statistics for the dashboard
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated user counts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     admins:
 *                       type: integer
 *                     attendants:
 *                       type: integer
 *                     verified:
 *                       type: integer
 *                     unverified:
 *                       type: integer
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 */
// Dashboard stats. Defined BEFORE '/:id' so "stats" isn't mistaken for a user id.
router.get('/stats/summary', getStats);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users (paginated, searchable, filterable)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (max 100)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Case-insensitive search on firstName, lastName, email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, attendant]
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 *       422:
 *         description: Validation error
 */
// List users (paginated/searchable): validate query first, then run the controller
router.get('/', listRules, validate, listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a single user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User UUID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 *       404:
 *         description: User not found
 */
// Fetch one user by UUID
router.get('/:id', idParam, validate, getUser);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (admin-created accounts are pre-verified)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password, role]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane.doe@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: Secret123
 *               role:
 *                 type: string
 *                 enum: [admin, attendant]
 *                 example: attendant
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 *       409:
 *         description: Email already in use
 *       422:
 *         description: Validation error
 */
// Create a user (admin only); createRules enforce the password policy before the controller runs
router.post('/', createRules, validate, createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update a user's firstName, lastName, role, or isVerified
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, attendant]
 *               isVerified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
// Update a user; combine the id-param check with the partial-update body rules
router.put('/:id', [...idParam, ...updateRules], validate, updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admins cannot delete themselves)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted
 *       400:
 *         description: Cannot delete own account
 *       401:
 *         description: Unauthenticated
 *       403:
 *         description: Forbidden — admin only
 *       404:
 *         description: User not found
 */
// Delete a user by UUID (controller blocks deleting your own account)
router.delete('/:id', idParam, validate, deleteUser);

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         email:
 *           type: string
 *           format: email
 *         role:
 *           type: string
 *           enum: [admin, attendant]
 *         isVerified:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *         limit:
 *           type: integer
 *         total:
 *           type: integer
 *         totalPages:
 *           type: integer
 */

module.exports = router;
