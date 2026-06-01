/**
 * app.js — Express application setup for the REPORT-SERVICE (port 4005).
 * WHAT: Wires up security, parsing, logging, docs and the report routes,
 *       then exports the configured app (server.js actually starts it).
 * WHY: Keeping app config separate from server startup makes the app easy
 *      to import in tests without opening a real network port.
 */
const express = require('express');
const helmet = require('helmet'); // sets secure HTTP response headers
const cors = require('cors'); // allows the React frontend to call this API cross-origin
const morgan = require('morgan'); // HTTP request logger
const swaggerUi = require('swagger-ui-express'); // serves the interactive API docs page

const logger = require('./config/logger');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const reportRoutes = require('./routes/reportRoutes');
const swaggerSpec = require('./docs/swagger');

const app = express();

// --- Global middleware (runs in order on every request) ---
app.use(helmet()); // harden headers (XSS, clickjacking, etc.) before anything else
// Allow browser requests from the configured frontend URL ('*' = any in dev)
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10kb' })); // parse JSON bodies; small limit blocks oversized payloads
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form data
app.use(sanitize); // strip XSS payloads from body/query/params after parsing

// Stream HTTP request logs into Winston
app.use(morgan('combined', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
app.use('/api', apiLimiter); // throttle requests under /api to prevent abuse

// Lightweight health probe so the gateway / monitoring can confirm the service is up
app.get('/health', (_req, res) => res.json({ service: 'report-service', status: 'ok' }));
// Interactive Swagger UI and the raw OpenAPI JSON for tooling
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Report Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount the actual report endpoints (auth + admin checks live inside the router)
app.use('/api/reports', reportRoutes);

// Fallbacks: unknown route -> 404, then the central error handler (must be LAST)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
