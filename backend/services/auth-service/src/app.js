/*
 * app.js — Express application setup for the AUTH-SERVICE (port 4001).
 * This file wires together all middleware (security, logging, parsing,
 * sanitising, rate-limiting), mounts the auth routes and Swagger docs,
 * and exports the configured app. The actual server is started in server.js.
 * Role in the system: behind the gateway (4000), this service handles signup,
 * OTP email verification, login (JWT issuing) and the protected /me endpoint.
 */
const express = require('express');
const helmet = require('helmet'); // sets secure HTTP headers to harden the API
const cors = require('cors'); // controls which front-end origins may call this API
const morgan = require('morgan'); // HTTP request logger
const swaggerUi = require('swagger-ui-express'); // serves interactive API docs

const logger = require('./config/logger'); // Winston logger instance
const sanitize = require('./middleware/sanitize'); // XSS-cleaning middleware
const { apiLimiter } = require('./middleware/rateLimiter'); // general request rate limiter
const { notFound, errorHandler } = require('./middleware/errorHandler'); // 404 + central error handlers
const authRoutes = require('./routes/authRoutes'); // /api/auth route definitions
const swaggerSpec = require('./docs/swagger'); // generated OpenAPI spec

const app = express();

// --- Global middleware (runs on every incoming request, in order) ---
app.use(helmet()); // add security headers (XSS, clickjacking, etc.)
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true })); // allow the React client to call us; credentials lets cookies/auth headers through
app.use(express.json({ limit: '10kb' })); // parse JSON bodies; cap size to block oversized/abuse payloads
app.use(express.urlencoded({ extended: true })); // parse URL-encoded form bodies
app.use(sanitize); // strip XSS payloads from body/query/params before controllers run

// Stream HTTP request logs into Winston
app.use(morgan('combined', { stream: { write: (msg) => logger.http?.(msg.trim()) || logger.info(msg.trim()) } }));
app.use('/api', apiLimiter); // throttle all /api traffic to mitigate abuse/DoS

// Lightweight health check so the gateway/monitoring can confirm the service is up
app.get('/health', (_req, res) => res.json({ service: 'auth-service', status: 'ok' }));
// Interactive Swagger UI + raw JSON spec for exploring the API
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Auth Service Docs' }));
app.get('/docs.json', (_req, res) => res.json(swaggerSpec));

// Mount all authentication endpoints under /api/auth
app.use('/api/auth', authRoutes);

// --- Error handling (must be LAST so it catches everything above) ---
app.use(notFound); // 404 handler for unmatched routes
app.use(errorHandler); // central error formatter -> standard error envelope

module.exports = app;
