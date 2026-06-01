/**
 * reportRoutes.js — Defines the /api/reports endpoints and their middleware chain.
 * WHAT: Maps each report URL to its controller, after running auth, validation
 *       and (for some) pagination checks. Also holds the Swagger JSDoc that
 *       documents each endpoint.
 * NOTE: Per-route request flow is: authenticate -> authorize('admin') ->
 *       validators -> validate -> controller.
 */
const express = require('express');
const { query } = require('express-validator');
const ctrl = require('../controllers/reportController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All report endpoints require a valid JWT with role 'admin'
// router.use applies these two middlewares to EVERY route below in this file.
router.use(authenticate, authorize('admin'));

// Reusable date-range query validators
// Shared rule set: from/to are optional, but if present must be ISO 8601 dates.
const dateRangeRules = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('from must be a valid ISO 8601 date string'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('to must be a valid ISO 8601 date string'),
];

// Pagination validators
// Shared rule set: page>=1 and 1<=limit<=100 (mirrors the clamps in the controller).
const paginationRules = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Read-only reporting and analytics endpoints (admin only)
 */

/**
 * @swagger
 * /api/reports/outgoing:
 *   get:
 *     summary: Paginated list of cars that have exited within a date range
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00Z"
 *         description: Start of date range (ISO 8601). Defaults to 30 days ago.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-12-31T23:59:59Z"
 *         description: End of date range (ISO 8601). Defaults to now.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Records per page (max 100).
 *     responses:
 *       200:
 *         description: Outgoing cars retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Outgoing cars retrieved successfully }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CarEntry' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *                     count: { type: integer }
 *                     totalCharged: { type: number, format: float }
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Insufficient permissions (admin only)
 *       422:
 *         description: Validation error
 */
// Exited cars + total charged in the range (date + pagination validated first).
router.get('/outgoing', [...dateRangeRules, ...paginationRules], validate, ctrl.getOutgoing);

/**
 * @swagger
 * /api/reports/incoming:
 *   get:
 *     summary: Paginated list of all cars that entered within a date range
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00Z"
 *         description: Start of date range (ISO 8601). Defaults to 30 days ago.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-12-31T23:59:59Z"
 *         description: End of date range (ISO 8601). Defaults to now.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Records per page (max 100).
 *     responses:
 *       200:
 *         description: Incoming cars retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Incoming cars retrieved successfully }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/CarEntry' }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *                     total: { type: integer }
 *                     totalPages: { type: integer }
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Insufficient permissions (admin only)
 *       422:
 *         description: Validation error
 */
// All cars that entered in the range (any status), paginated.
router.get('/incoming', [...dateRangeRules, ...paginationRules], validate, ctrl.getIncoming);

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: System-wide summary statistics across both car entries and parkings
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Summary retrieved successfully }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalEntries:    { type: integer, example: 1500 }
 *                     currentlyParked: { type: integer, example: 42 }
 *                     totalExited:     { type: integer, example: 1458 }
 *                     totalRevenue:    { type: number, example: 72900.00 }
 *                     totalParkings:   { type: integer, example: 5 }
 *                     totalSpaces:     { type: integer, example: 250 }
 *                     totalAvailable:  { type: integer, example: 208 }
 *                     occupiedSpaces:  { type: integer, example: 42 }
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Insufficient permissions (admin only)
 */
// KPI dashboard totals; no query params, so no validators needed.
router.get('/summary', ctrl.getSummary);

/**
 * @swagger
 * /api/reports/revenue:
 *   get:
 *     summary: Daily revenue and car count grouped by day for charting
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00Z"
 *         description: Start of date range (ISO 8601). Defaults to 30 days ago.
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *           example: "2024-12-31T23:59:59Z"
 *         description: End of date range (ISO 8601). Defaults to now.
 *     responses:
 *       200:
 *         description: Revenue data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Revenue data retrieved successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:    { type: string, format: date, example: "2024-06-15" }
 *                       revenue: { type: number, example: 4500.00 }
 *                       cars:    { type: integer, example: 90 }
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Insufficient permissions (admin only)
 *       422:
 *         description: Validation error
 */
// Revenue + car count grouped per day (only date validators, no pagination).
router.get('/revenue', dateRangeRules, validate, ctrl.getRevenue);

/**
 * @swagger
 * /api/reports/occupancy:
 *   get:
 *     summary: Per-parking occupancy rates for charting
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Occupancy data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: Occupancy data retrieved successfully }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:           { type: string, example: "PKA" }
 *                       parkingName:    { type: string, example: "Parking A" }
 *                       totalSpaces:    { type: integer, example: 50 }
 *                       availableSpaces:{ type: integer, example: 30 }
 *                       occupied:       { type: integer, example: 20 }
 *                       occupancyRate:  { type: number, example: 40.00 }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                       properties:
 *                         totalSpaces:          { type: integer }
 *                         totalAvailable:       { type: integer }
 *                         totalOccupied:        { type: integer }
 *                         overallOccupancyRate: { type: number }
 *       401:
 *         description: Authentication token missing or invalid
 *       403:
 *         description: Insufficient permissions (admin only)
 */
// Current occupancy per lot + system totals; reads live capacity, no params.
router.get('/occupancy', ctrl.getOccupancy);

/**
 * @swagger
 * components:
 *   schemas:
 *     CarEntry:
 *       type: object
 *       properties:
 *         id:              { type: string, format: uuid }
 *         plateNumber:     { type: string, example: "RAA 001 A" }
 *         parkingCode:     { type: string, example: "PKA" }
 *         entryDateTime:   { type: string, format: date-time }
 *         exitDateTime:    { type: string, format: date-time, nullable: true }
 *         chargedAmount:   { type: number, format: float, nullable: true }
 *         durationMinutes: { type: integer, nullable: true }
 *         status:          { type: string, enum: [parked, exited] }
 *         createdAt:       { type: string, format: date-time }
 *         updatedAt:       { type: string, format: date-time }
 */

// Expose the configured router so app.js can mount it at /api/reports.
module.exports = router;
