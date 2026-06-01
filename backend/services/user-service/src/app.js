/*
 * app.js — Express application wiring for the USER-SERVICE (admin user management).
 * Builds the middleware pipeline (security, parsing, sanitising, logging, rate limiting),
 * mounts the /api/users routes and Swagger docs, then exports the configured app.
 * server.js imports this and actually starts listening. This is the admin-only service
 * that does CRUD over the shared `users` table (port 4002, reached via gateway 4000).
 */
const express = require('express');
const helmet = require('helmet'); // sets secure HTTP headers to harden the service
const cors = require('cors'); // controls which browser origins may call the API
const morgan = require('morgan'); // HTTP request logger middleware
const swaggerUi = require('swagger-ui-express'); // serves the interactive API docs UI

const logger = require('./config/logger');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const swaggerSpec = require('./docs/swagger');

const app = express();

// --- Security & body-parsing middleware (order matters: runs top to bottom) ---
app.use(helmet()); // add protective headers (XSS, clickjacking, etc.) before anything else
// Allow the configured frontend origin (falls back to any origin in dev); credentials lets cookies/auth headers through
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10kb' })); // parse JSON bodies; 10kb cap blocks oversized/abusive payloads
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form bodies
app.use(sanitize); // strip XSS payloads from incoming body/query/params before they reach controllers

// Stream HTTP request logs into Winston (so request logs land in the same files as app logs)
app.use(morgan('combined', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
app.use('/api', apiLimiter); // throttle every /api request to mitigate abuse/DoS

// Lightweight liveness probe so the gateway/monitoring can check the service is up
app.get('/health', (_req, res) => res.json({ service: 'user-service', status: 'ok' }));
// Interactive Swagger UI and the raw OpenAPI JSON for this service's API
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'User Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount the admin user-management endpoints (auth/admin checks live inside the router)
app.use('/api/users', userRoutes);

// 404 for unmatched routes, then the central error handler — both MUST come last in the chain
app.use(notFound);
app.use(errorHandler);

module.exports = app; // exported so server.js can connect the DB and start listening
