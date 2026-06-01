/**
 * routes/carEntryRoutes.js — maps /api/car-entries URLs to controller handlers.
 *
 * WHAT: Declares each endpoint and the middleware chain it runs through:
 *       authenticate -> (authorize) -> validation rules -> validate -> controller.
 * WHY:  Routes stay thin — they only wire auth, validation, and the handler. The
 *       /** @swagger ... *\/ blocks document each endpoint for the OpenAPI spec.
 */
const express = require('express');
const { body, query } = require('express-validator'); // request validation rule builders
const ctrl = require('../controllers/carEntryController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// NOTE: order matters — '/stats/summary' and '/:id' are both GETs, so the literal
// route is declared before the ':id' param route so 'stats' isn't read as an id.

/**
 * @swagger
 * tags:
 *   name: CarEntries
 *   description: Car entry, exit, ticket and billing management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Ticket:
 *       type: object
 *       properties:
 *         ticketId:            { type: string, format: uuid }
 *         plateNumber:         { type: string, example: RAB123A }
 *         parkingCode:         { type: string, example: PK002 }
 *         parkingName:         { type: string, example: Kigali Central Parking }
 *         location:            { type: string, example: Nyarugenge }
 *         entryDateTime:       { type: string, format: date-time }
 *         chargingFeePerHour:  { type: number, example: 500 }
 *         message:             { type: string, example: Keep this ticket for exit }
 *     Bill:
 *       type: object
 *       properties:
 *         entryId:             { type: string, format: uuid }
 *         plateNumber:         { type: string, example: RAB123A }
 *         parkingCode:         { type: string, example: PK002 }
 *         entryDateTime:       { type: string, format: date-time }
 *         exitDateTime:        { type: string, format: date-time }
 *         durationMinutes:     { type: integer, example: 135 }
 *         durationLabel:       { type: string, example: "2h 15m" }
 *         billableHours:       { type: integer, example: 3 }
 *         chargingFeePerHour:  { type: number, example: 500 }
 *         chargedAmount:       { type: number, example: 1500 }
 *         currency:            { type: string, example: RWF }
 *     CarEntry:
 *       type: object
 *       properties:
 *         id:              { type: string, format: uuid }
 *         plateNumber:     { type: string, example: RAB123A }
 *         parkingCode:     { type: string, example: PK002 }
 *         entryDateTime:   { type: string, format: date-time }
 *         exitDateTime:    { type: string, format: date-time, nullable: true }
 *         chargedAmount:   { type: number, example: 0 }
 *         durationMinutes: { type: integer, nullable: true }
 *         status:          { type: string, enum: [parked, exited] }
 *         createdAt:       { type: string, format: date-time }
 *         updatedAt:       { type: string, format: date-time }
 */

/* ──────────────────────────────────────────────────────────
   GET /api/car-entries  — paginated list (any authenticated user)
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries:
 *   get:
 *     summary: List car entries (paginated, filterable)
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *         description: Results per page (max 100)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Partial plate number search (case-insensitive)
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [parked, exited] }
 *         description: Filter by entry status
 *       - in: query
 *         name: parkingCode
 *         schema: { type: string }
 *         description: Filter by parking code
 *     responses:
 *       200:
 *         description: Paginated list of car entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CarEntry' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:       { type: integer }
 *                     limit:      { type: integer }
 *                     total:      { type: integer }
 *                     totalPages: { type: integer }
 *       401: { description: Unauthorized }
 */
// Any authenticated user can list entries; query params are validated before the handler.
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('status').optional().isIn(['parked', 'exited']).withMessage('status must be parked or exited'),
  ],
  validate,
  ctrl.listEntries
);

/* ──────────────────────────────────────────────────────────
   GET /api/car-entries/stats/summary  — admin summary
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries/stats/summary:
 *   get:
 *     summary: Get aggregate statistics (admin only)
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Summary statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEntries:    { type: integer }
 *                     currentlyParked: { type: integer }
 *                     exited:          { type: integer }
 *                     totalRevenue:    { type: number }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
// Admin-only aggregate stats (authorize('admin') runs after authenticate).
router.get('/stats/summary', authenticate, authorize('admin'), ctrl.getSummary);

/* ──────────────────────────────────────────────────────────
   GET /api/car-entries/:id  — single entry
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries/{id}:
 *   get:
 *     summary: Get a car entry by ID
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Car entry details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/CarEntry' }
 *       401: { description: Unauthorized }
 *       404: { description: Not found }
 */
// Fetch a single entry by UUID (any authenticated user).
router.get('/:id', authenticate, ctrl.getEntry);

/* ──────────────────────────────────────────────────────────
   POST /api/car-entries  — register entry (admin)
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries:
 *   post:
 *     summary: Register a car entry and receive a ticket (admin only)
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plateNumber, parkingCode]
 *             properties:
 *               plateNumber:  { type: string, example: RAB123A }
 *               parkingCode:  { type: string, example: PK002 }
 *     responses:
 *       201:
 *         description: Entry registered — ticket returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Ticket' }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       409: { description: Parking is full }
 *       422: { description: Validation error }
 */
// Register a car entry — admin only; body must carry a valid plate + parking code.
router.post(
  '/',
  authenticate,
  authorize('admin'),
  [
    body('plateNumber')
      .trim()
      .notEmpty().withMessage('Plate number is required')
      .matches(/^[A-Za-z0-9]+$/).withMessage('Plate number must be alphanumeric'), // letters/digits only — no spaces or symbols
    body('parkingCode')
      .trim()
      .notEmpty().withMessage('Parking code is required'),
  ],
  validate,
  ctrl.registerEntry
);

/* ──────────────────────────────────────────────────────────
   PATCH /api/car-entries/:id/exit  — register exit (admin)
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries/{id}/exit:
 *   patch:
 *     summary: Register car exit and receive a bill (admin only)
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Exit registered — bill returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Bill' }
 *       400: { description: Car already exited }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 *       404: { description: Entry not found }
 */
// Register exit and compute the bill — admin only (PATCH = partial update of the entry).
router.patch('/:id/exit', authenticate, authorize('admin'), ctrl.registerExit);

/* ──────────────────────────────────────────────────────────
   GET /api/car-entries/:id/ticket  — fetch ticket
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries/{id}/ticket:
 *   get:
 *     summary: Get the entry ticket for a car
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Ticket' }
 *       401: { description: Unauthorized }
 *       404: { description: Entry not found }
 */
// Re-print the entry ticket (any authenticated user).
router.get('/:id/ticket', authenticate, ctrl.getTicket);

/* ──────────────────────────────────────────────────────────
   GET /api/car-entries/:id/bill  — fetch bill
────────────────────────────────────────────────────────── */
/**
 * @swagger
 * /api/car-entries/{id}/bill:
 *   get:
 *     summary: Get the bill for an exited car
 *     tags: [CarEntries]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Bill details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Bill' }
 *       400: { description: Car has not exited yet }
 *       401: { description: Unauthorized }
 *       404: { description: Entry not found }
 */
// Fetch the bill for an already-exited car (any authenticated user).
router.get('/:id/bill', authenticate, ctrl.getBill);

module.exports = router;
