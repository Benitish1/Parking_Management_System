/*
 * server.js — entry point for the user-service.
 * Loads env vars, connects to Postgres, syncs the model, then starts the HTTP server.
 * Kept separate from app.js so the app can be imported in tests without binding a port.
 */
require('dotenv').config(); // load .env into process.env (must run before anything reads env vars)
const app = require('./app');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./models/User'); // require the model so sequelize.sync() knows about the users table

const PORT = process.env.USER_PORT || 4002; // this service's port (gateway proxies here)

// Async IIFE: do startup work in order, and only listen once the DB is ready
(async () => {
  try {
    await connectDB(); // fail fast if the database is unreachable
    await sequelize.sync(); // ensure the table matches the model (dev convenience)
    logger.info('[user-service] Models synchronised');
    app.listen(PORT, () => logger.info(`[user-service] running on http://localhost:${PORT} (docs at /docs)`));
  } catch (err) {
    logger.error(`[user-service] startup failed: ${err.message}`);
    process.exit(1); // can't run without DB/models — exit so a supervisor can restart it
  }
})();

// Last-resort safety net: log any promise rejection that wasn't caught elsewhere
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
