/*
 * NOTIFICATION SERVICE (port 4006) — Express app setup.
 *
 * This microservice's job is to send emails: OTP codes (called by auth-service
 * during signup/verification) and generic transactional emails. It does the
 * actual sending via Nodemailer (see services/mailer.js).
 *
 * This file wires up the middleware chain in the order requests flow through it,
 * then mounts the routes. Listening happens in server.js (kept separate for testing).
 */
const express = require('express');
const helmet = require('helmet'); // secure HTTP headers
const cors = require('cors'); // cross-origin access control
const morgan = require('morgan'); // HTTP request logging
const swaggerUi = require('swagger-ui-express'); // serves the interactive API docs page

const logger = require('./config/logger');
const sanitize = require('./middleware/sanitize'); // strips XSS/HTML from incoming data
const { apiLimiter } = require('./middleware/rateLimiter'); // per-IP request throttle
const { notFound, errorHandler } = require('./middleware/errorHandler'); // 404 + central error handling
const notificationRoutes = require('./routes/notificationRoutes');
const swaggerSpec = require('./docs/swagger'); // generated OpenAPI spec

const app = express();

// --- Middleware chain (order matters: each runs top-to-bottom per request) ---
app.use(helmet()); // 1) harden headers before anything else
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true })); // 2) allow the frontend origin
app.use(express.json({ limit: '50kb' })); // 3) parse JSON bodies; cap size to block oversized payloads
app.use(sanitize); // 4) clean parsed input to prevent stored/reflected XSS
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } })); // 5) log the request via winston
app.use('/api', apiLimiter); // 6) rate-limit only the real API routes (not /health or /docs)

// Liveness probe so the gateway/monitoring can confirm this service is up.
app.get('/health', (_req, res) => res.json({ service: 'notification-service', status: 'ok' }));
// Interactive Swagger UI and the raw JSON spec, for exploring/testing the API.
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Notification Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount the notification endpoints (OTP + generic email) under their public prefix.
app.use('/api/notifications', notificationRoutes);

// These two must come LAST: anything not matched above falls to notFound (404),
// and any error thrown/passed via next(err) ends up in errorHandler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
