/**
 * server.js — Entry point that boots the report-service (port 4005).
 * WHAT: Loads env vars, connects to the shared DB, registers the read-models,
 *       then starts the HTTP server.
 * WHY: Separated from app.js so the app can be tested without binding a port.
 */
require('dotenv').config(); // load .env into process.env first, before anything reads it
const app = require('./app');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');

// Register read-models (tables already exist — sync() is safe, no force/alter)
// Requiring them registers the models on the Sequelize instance so queries work.
require('./models/CarEntry');
require('./models/Parking');

const PORT = process.env.REPORT_PORT || 4005; // fixed service port (gateway proxies to it)

// IIFE so we can use async/await for the ordered startup steps.
(async () => {
  try {
    await connectDB(); // fail fast if the database is unreachable
    // sequelize.sync() without force/alter; tables already created by other services
    // WHY no force/alter: this service must NOT modify the shared schema it only reads.
    await sequelize.sync();
    logger.info('[report-service] Models synchronised');
    app.listen(PORT, () => logger.info(`[report-service] running on http://localhost:${PORT} (docs at /docs)`));
  } catch (err) {
    logger.error(`[report-service] startup failed: ${err.message}`);
    process.exit(1); // non-zero exit signals the failure to process managers/Docker
  }
})();

// Safety net: log promise rejections that weren't caught anywhere so they don't vanish silently.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
