// ---------------------------------------------------------------------------
// routes/parkingRoutes.js — Maps HTTP endpoints to controller handlers.
// WHAT: each route wires up its middleware pipeline: authenticate (and
//       authorize for admin-only routes) -> express-validator rules ->
//       validate -> the controller. The /** @swagger */ blocks document the API.
// WHY:  declaring the chain here keeps auth, validation, and docs next to the
//       endpoint they protect. (Do not edit the @swagger comments.)
// ---------------------------------------------------------------------------
const express = require('express');
const { body, param, query } = require('express-validator'); // rule builders for body/path/query
const ctrl = require('../controllers/parkingController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Parkings
 *   description: Parking lot management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Parking:
 *       type: object
 *       properties:
 *         id:               { type: string, format: uuid, example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" }
 *         code:             { type: string, example: "PK001" }
 *         parkingName:      { type: string, example: "Kigali Heights Parking" }
 *         totalSpaces:      { type: integer, example: 120 }
 *         availableSpaces:  { type: integer, example: 85 }
 *         location:         { type: string, example: "KG 7 Ave, Kigali" }
 *         chargingFeePerHour: { type: number, format: float, example: 500.00 }
 *         createdAt:        { type: string, format: date-time }
 *         updatedAt:        { type: string, format: date-time }
 *     ParkingInput:
 *       type: object
 *       required: [code, parkingName, totalSpaces, location, chargingFeePerHour]
 *       properties:
 *         code:             { type: string, example: "PK005" }
 *         parkingName:      { type: string, example: "New City Parking" }
 *         totalSpaces:      { type: integer, minimum: 1, example: 100 }
 *         availableSpaces:  { type: integer, minimum: 0, example: 100 }
 *         location:         { type: string, example: "KG 10 Ave, Kigali" }
 *         chargingFeePerHour: { type: number, minimum: 0, example: 500 }
 *     OccupancyEntry:
 *       type: object
 *       properties:
 *         code:             { type: string, example: "PK001" }
 *         parkingName:      { type: string, example: "Kigali Heights Parking" }
 *         totalSpaces:      { type: integer, example: 120 }
 *         availableSpaces:  { type: integer, example: 85 }
 *         occupied:         { type: integer, example: 35 }
 *         occupancyRate:    { type: number, example: 29.17 }
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:       { type: integer, example: 1 }
 *         limit:      { type: integer, example: 10 }
 *         total:      { type: integer, example: 4 }
 *         totalPages: { type: integer, example: 1 }
 */

/**
 * @swagger
 * /api/parkings:
 *   get:
 *     summary: List all parking lots (paginated, searchable)
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *         description: Items per page (max 100)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search term matched against code, parkingName, and location
 *     responses:
 *       200:
 *         description: Paginated list of parking lots
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: "Parkings retrieved successfully" }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Parking' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 *       401: { description: Unauthorized — token missing or invalid }
 */
// List parkings: any logged-in user; validate pagination query params first
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  ],
  validate,
  ctrl.listParkings
);

/**
 * @swagger
 * /api/parkings/stats/occupancy:
 *   get:
 *     summary: Get occupancy statistics for all parking lots (admin only)
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Occupancy statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     parkings:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/OccupancyEntry' }
 *                     overall:
 *                       type: object
 *                       properties:
 *                         totalSpaces:    { type: integer, example: 550 }
 *                         totalAvailable: { type: integer, example: 495 }
 *                         totalOccupied:  { type: integer, example: 55 }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 */
// Occupancy stats: admin only. Declared BEFORE '/:id' so "stats" isn't mistaken for an :id value.
router.get('/stats/occupancy', authenticate, authorize('admin'), ctrl.getOccupancyStats);

/**
 * @swagger
 * /api/parkings/{id}:
 *   get:
 *     summary: Get a parking lot by ID
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Parking UUID
 *     responses:
 *       200:
 *         description: Parking lot details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       404: { description: Parking not found }
 */
// Get one parking by UUID: any logged-in user; ensure :id is a valid UUID
router.get(
  '/:id',
  authenticate,
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validate,
  ctrl.getParkingById
);

/**
 * @swagger
 * /api/parkings/code/{code}:
 *   get:
 *     summary: Get a parking lot by code
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, example: "PK001" }
 *         description: Parking code (case-insensitive)
 *     responses:
 *       200:
 *         description: Parking lot details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       404: { description: Parking not found }
 */
// Get one parking by code: used by car-entry-service to resolve a lot from its code
router.get(
  '/code/:code',
  authenticate,
  [param('code').trim().notEmpty().withMessage('code is required')],
  validate,
  ctrl.getParkingByCode
);

/**
 * @swagger
 * /api/parkings:
 *   post:
 *     summary: Create a new parking lot (admin only)
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ParkingInput' }
 *     responses:
 *       201:
 *         description: Parking created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       409: { description: Parking code already exists }
 *       422: { description: Validation error }
 */
// Create parking: admin only; validate all required fields before creating
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('code').trim().notEmpty().withMessage('code is required'),
    body('parkingName').trim().notEmpty().withMessage('parkingName is required'),
    body('totalSpaces')
      .isInt({ min: 1 })
      .withMessage('totalSpaces must be an integer greater than or equal to 1'),
    body('availableSpaces')
      .optional()
      .isInt({ min: 0 })
      .withMessage('availableSpaces must be a non-negative integer'),
    body('location').trim().notEmpty().withMessage('location is required'),
    body('chargingFeePerHour')
      .isFloat({ min: 0 })
      .withMessage('chargingFeePerHour must be a numeric value greater than or equal to 0'),
  ],
  validate,
  ctrl.createParking
);

/**
 * @swagger
 * /api/parkings/{id}:
 *   put:
 *     summary: Update a parking lot (admin only)
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:             { type: string, example: "PK001" }
 *               parkingName:      { type: string, example: "Updated Name" }
 *               totalSpaces:      { type: integer, minimum: 1, example: 150 }
 *               availableSpaces:  { type: integer, minimum: 0, example: 100 }
 *               location:         { type: string, example: "KG 7 Ave, Kigali" }
 *               chargingFeePerHour: { type: number, minimum: 0, example: 600 }
 *     responses:
 *       200:
 *         description: Parking updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Parking not found }
 *       422: { description: Validation error }
 */
// Update parking: admin only; all body fields optional (partial update)
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  [
    param('id').isUUID().withMessage('id must be a valid UUID'),
    body('code').optional().trim().notEmpty().withMessage('code cannot be empty'),
    body('parkingName').optional().trim().notEmpty().withMessage('parkingName cannot be empty'),
    body('totalSpaces').optional().isInt({ min: 1 }).withMessage('totalSpaces must be an integer >= 1'),
    body('availableSpaces').optional().isInt({ min: 0 }).withMessage('availableSpaces must be a non-negative integer'),
    body('location').optional().trim().notEmpty().withMessage('location cannot be empty'),
    body('chargingFeePerHour').optional().isFloat({ min: 0 }).withMessage('chargingFeePerHour must be >= 0'),
  ],
  validate,
  ctrl.updateParking
);

/**
 * @swagger
 * /api/parkings/{id}:
 *   delete:
 *     summary: Delete a parking lot (admin only)
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Parking deleted }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden — admin only }
 *       404: { description: Parking not found }
 */
// Delete parking: admin only; :id must be a valid UUID
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  [param('id').isUUID().withMessage('id must be a valid UUID')],
  validate,
  ctrl.deleteParking
);

/**
 * @swagger
 * /api/parkings/code/{code}/occupy:
 *   patch:
 *     summary: Decrement availableSpaces by 1 — internal use by car-entry-service on car entry
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, example: "PK001" }
 *     responses:
 *       200:
 *         description: Space occupied — returns updated parking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       404: { description: Parking not found }
 *       409: { description: Parking is full }
 */
// Occupy a space (car entry): authenticated; decrements availableSpaces
router.patch(
  '/code/:code/occupy',
  authenticate,
  [param('code').trim().notEmpty().withMessage('code is required')],
  validate,
  ctrl.occupyParking
);

/**
 * @swagger
 * /api/parkings/code/{code}/release:
 *   patch:
 *     summary: Increment availableSpaces by 1 — internal use by car-entry-service on car exit
 *     tags: [Parkings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string, example: "PK001" }
 *     responses:
 *       200:
 *         description: Space released — returns updated parking
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data: { $ref: '#/components/schemas/Parking' }
 *       401: { description: Unauthorized }
 *       404: { description: Parking not found }
 */
// Release a space (car exit): authenticated; increments availableSpaces
router.patch(
  '/code/:code/release',
  authenticate,
  [param('code').trim().notEmpty().withMessage('code is required')],
  validate,
  ctrl.releaseParking
);

module.exports = router;
