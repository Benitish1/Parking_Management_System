/**
 * server.js — entry point that boots the Car Entry Service.
 *
 * WHY: Connects to the DB and syncs models FIRST, then starts the HTTP listener,
 *      so the service never accepts requests before its database is ready.
 *      app.js builds the Express app; this file actually runs it on a port.
 */
require('dotenv').config(); // load env vars (DB creds, JWT_SECRET, port) before anything uses them
const app = require('./app');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./models/CarEntry'); // import model so sequelize.sync() knows about its table

const PORT = process.env.CARENTRY_PORT || 4004; // 4004 is this service's assigned port in the system

// Async startup sequence: DB up -> models synced -> begin listening.
(async () => {
  try {
    await connectDB(); // fail fast if the database is unreachable
    await sequelize.sync(); // create/update tables to match the models
    logger.info('[car-entry-service] Models synchronised');
    app.listen(PORT, () => logger.info(`[car-entry-service] running on http://localhost:${PORT} (docs at /docs)`));
  } catch (err) {
    logger.error(`[car-entry-service] startup failed: ${err.message}`);
    process.exit(1); // abort startup so a broken instance isn't left running
  }
})();

// Safety net: log promise rejections that weren't caught anywhere instead of crashing silently.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
