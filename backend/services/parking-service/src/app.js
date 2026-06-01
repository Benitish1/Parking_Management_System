// ---------------------------------------------------------------------------
// app.js — Express application factory for the PARKING-SERVICE (port 4003).
// WHAT: wires up global middleware (security, CORS, body parsing, sanitising,
//       logging, rate limiting), mounts the parking routes + Swagger docs, and
//       attaches the not-found/error handlers.
// WHY:  keeping app construction here (separate from server.js) lets tests load
//       the app without actually opening a network port.
// ---------------------------------------------------------------------------
const express = require('express');
const helmet = require('helmet');        // sets secure HTTP response headers
const cors = require('cors');            // controls which origins may call this API
const morgan = require('morgan');        // HTTP request logger
const swaggerUi = require('swagger-ui-express'); // serves the interactive API docs UI

const logger = require('./config/logger');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const parkingRoutes = require('./routes/parkingRoutes');
const swaggerSpec = require('./docs/swagger');

const app = express();

// --- Global middleware (runs on every request, in order) ---
app.use(helmet());                       // add security headers to mitigate common web attacks
// Allow the configured frontend origin (falls back to '*' in dev); credentials lets cookies/auth pass through
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10kb' }));    // parse JSON bodies; 10kb cap blocks oversized payloads
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form bodies
app.use(sanitize);                       // strip XSS payloads from body/query/params before controllers see them

// Stream HTTP request logs into Winston (so requests land in our log files, not just stdout)
app.use(morgan('combined', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
app.use('/api', apiLimiter);             // throttle all /api traffic to protect against abuse/floods

// Lightweight health check used by the gateway/monitoring to confirm the service is up
app.get('/health', (_req, res) => res.json({ service: 'parking-service', status: 'ok' }));
// Interactive Swagger UI and the raw OpenAPI JSON (handy for tooling/imports)
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Parking Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount the parking feature routes under their base path
app.use('/api/parkings', parkingRoutes);

// 404 for unmatched routes, then the central error handler (must be LAST so it catches everything above)
app.use(notFound);
app.use(errorHandler);

module.exports = app;
