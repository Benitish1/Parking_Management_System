/*
 * server.js — Entry point that actually starts the auth-service.
 * It loads env vars, connects to PostgreSQL, syncs the models, then begins
 * listening on AUTH_PORT (default 4001). app.js builds the Express app; this
 * file is responsible only for bootstrapping it.
 */
require('dotenv').config(); // load environment variables from .env first
const app = require('./app');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./models/User'); // import the model so Sequelize registers it before sync()

const PORT = process.env.AUTH_PORT || 4001; // this service's port (behind gateway 4000)

// Async bootstrap: DB must be ready before we accept traffic
(async () => {
  try {
    await connectDB(); // open/verify the DB connection
    await sequelize.sync(); // create/update tables to match the models
    logger.info('[auth-service] Models synchronised');
    app.listen(PORT, () => logger.info(`[auth-service] running on http://localhost:${PORT} (docs at /docs)`));
  } catch (err) {
    // If startup fails (e.g. DB down) there's no point staying alive — exit so the supervisor can restart
    logger.error(`[auth-service] startup failed: ${err.message}`);
    process.exit(1);
  }
})();

// Safety net: log any promise rejection that wasn't caught, instead of crashing silently
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
