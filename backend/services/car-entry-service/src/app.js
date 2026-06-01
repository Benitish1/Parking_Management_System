/**
 * app.js — Express application setup for the Car Entry Service.
 *
 * WHAT: Builds and configures the Express `app` (security, parsing, logging,
 *       rate limiting, routes, Swagger docs, error handling) and exports it.
 * WHY:  Keeping app construction here (separate from server.js, which starts
 *       the HTTP listener) makes the app importable in tests without opening a port.
 *       This service records car entries/exits and computes parking bills.
 */
const express = require('express');
const helmet = require('helmet'); // sets secure HTTP response headers
const cors = require('cors'); // allows the React frontend (different origin) to call this API
const morgan = require('morgan'); // HTTP request logging middleware
const swaggerUi = require('swagger-ui-express'); // serves interactive API docs UI

const logger = require('./config/logger');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const carEntryRoutes = require('./routes/carEntryRoutes');
const swaggerSpec = require('./docs/swagger');

const app = express();

// Global middleware chain — order matters; each request flows top to bottom.
app.use(helmet()); // harden headers (XSS, clickjacking, etc.) before anything else
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true })); // permit cross-origin calls from the frontend
app.use(express.json({ limit: '10kb' })); // parse JSON bodies; 10kb cap blocks oversized/abusive payloads
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form bodies
app.use(sanitize); // strip XSS payloads from body/query/params after parsing

// Stream HTTP request logs into Winston
app.use(morgan('combined', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
app.use('/api', apiLimiter); // throttle all /api traffic to prevent abuse

// Health probe — used by the gateway / monitoring to confirm the service is up.
app.get('/health', (_req, res) => res.json({ service: 'car-entry-service', status: 'ok' }));
// Interactive Swagger UI and the raw OpenAPI JSON spec for this service.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Car Entry Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount the feature routes under their base path.
app.use('/api/car-entries', carEntryRoutes);

// Fallbacks: 404 for unknown routes, then the central error handler (must be last).
app.use(notFound);
app.use(errorHandler);

module.exports = app;
