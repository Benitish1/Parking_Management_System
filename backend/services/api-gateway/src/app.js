/*
 * API GATEWAY (port 4000) — the single public entry point for the XWZ Parking system.
 *
 * The frontend never talks to the microservices directly. Instead it calls this
 * gateway, which proxies (forwards) each request to the correct downstream service
 * based on its URL prefix (see routes.js):
 *   /api/auth -> auth-service(4001), /api/users -> user-service(4002),
 *   /api/parkings -> parking-service(4003), /api/car-entries -> car-entry-service(4004),
 *   /api/reports -> report-service(4005), /api/notifications -> notification-service(4006).
 *
 * This file builds the Express app and its middleware chain. The actual listening
 * happens in server.js. Keeping app and server separate makes the app easy to test.
 */
const express = require('express');
const helmet = require('helmet'); // sets secure HTTP headers (defends against common web attacks)
const cors = require('cors'); // controls which browser origins may call the gateway
const morgan = require('morgan'); // HTTP request logger
const rateLimit = require('express-rate-limit'); // throttles abusive clients
const { createProxyMiddleware } = require('http-proxy-middleware'); // forwards requests to other services

const logger = require('./config/logger'); // shared winston logger for the gateway
const routes = require('./routes'); // the prefix -> target service mapping table

const app = express();

app.use(helmet()); // harden response headers first, before anything else runs
// Allow the React frontend (CLIENT_URL) to call us; fall back to "*" in dev.
// credentials:true lets the browser send cookies/auth headers cross-origin.
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
// Pipe morgan's HTTP access logs into our winston logger instead of raw stdout.
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));

// Global rate limit at the edge — because the gateway sits in front of every
// service, one limit here protects the whole system from request floods.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // rolling 15-minute window
    max: 600, // up to 600 requests per IP per window (higher than a single service, since all traffic funnels here)
    standardHeaders: true, // expose limit info via the standard RateLimit-* headers
    legacyHeaders: false, // drop the deprecated X-RateLimit-* headers
    message: { success: false, message: 'Too many requests through the gateway, please slow down.' }, // matches the {success, message} envelope
  })
);

// Landing / discovery page: returns a self-describing list of all services and
// where their docs live — handy for quickly seeing what the gateway routes to.
app.get('/', (_req, res) => {
  res.json({
    gateway: 'XWZ Parking API Gateway',
    status: 'ok',
    version: '1.0.0',
    services: routes.map((r) => ({ prefix: r.prefix, service: r.name, target: r.target, docs: `${r.target}/docs` })),
  });
});

// Health check used by monitoring/uptime tools to confirm the gateway is alive.
app.get('/health', async (_req, res) => {
  res.json({ gateway: 'ok', routes: routes.map((r) => r.name) });
});

// IMPORTANT: do NOT parse the body here — stream it straight to the target
// so POST/PUT/PATCH payloads are forwarded intact.
//
// We mount each proxy at the ROOT and match with `pathFilter` instead of
// `app.use(prefix, ...)`. Mounting on the prefix would make Express strip it
// from req.url, so the target would receive `/signup` instead of
// `/api/auth/signup` (→ 404). pathFilter preserves the full path.
// Register one proxy middleware per route entry. Each forwards matching requests
// to its downstream service.
routes.forEach(({ prefix, target, name }) => {
  app.use(
    createProxyMiddleware({
      // Match the prefix itself (e.g. /api/auth) or anything under it (/api/auth/...),
      // while NOT matching unrelated prefixes that merely start the same.
      pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`),
      target, // where to send the request, e.g. http://localhost:4001
      changeOrigin: true, // rewrite the Host header to the target so the service sees the right host
      on: {
        // Debug log every forwarded request so we can trace which service handled it.
        proxyReq: (proxyReq, req) => logger.debug(`→ ${req.method} ${req.originalUrl} → ${name}`),
        // If the target is down/unreachable, log it and reply 502 (Bad Gateway)
        // instead of crashing or hanging the client.
        error: (err, req, res) => {
          logger.error(`Proxy error for ${name}: ${err.message}`);
          if (res && !res.headersSent) { // guard: only respond if nothing was sent yet
            res.status(502).json({ success: false, message: `${name} is unavailable. Please try again shortly.` });
          }
        },
      },
    })
  );
});

// Catch-all: any request that matched no proxy prefix gets a clear 404 in our envelope.
app.use((req, res) => res.status(404).json({ success: false, message: `Gateway: no route for ${req.originalUrl}` }));

module.exports = app;
