/*
 * Entry point for the API gateway process.
 * It loads environment variables, takes the configured Express app from app.js,
 * and starts listening on the gateway port (default 4000). Splitting this from
 * app.js keeps the "how to start" logic separate from the "what the app does" logic.
 */
require('dotenv').config(); // load .env into process.env before anything reads it
const app = require('./app');
const logger = require('./config/logger');
const routes = require('./routes');

// The port to listen on; configurable via env, defaults to 4000 for local dev.
const PORT = process.env.GATEWAY_PORT || 4000;

// Start the HTTP server and, on startup, print a tidy table of every route so
// developers can immediately see what the gateway is forwarding and where.
app.listen(PORT, () => {
  logger.info(`[api-gateway] running on http://localhost:${PORT}`);
  routes.forEach((r) => logger.info(`  ${r.prefix.padEnd(20)} → ${r.target} (${r.name})`)); // padEnd aligns the arrows neatly
});

// Safety net: log any promise rejection that wasn't caught so it isn't silently lost.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
