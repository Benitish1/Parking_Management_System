// ---------------------------------------------------------------------------
// server.js — Entry point that actually boots the parking-service.
// WHAT: loads config, connects to the DB, syncs the model, then starts
//       listening for HTTP requests on the service port (default 4003).
// WHY:  separated from app.js so the Express app can be imported by tests
//       without opening a real port; this file is what `node src/server.js` runs.
// ---------------------------------------------------------------------------
require('dotenv').config();              // load env vars before anything reads them
const app = require('./app');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
require('./models/Parking');             // import for its side effect: registers the model with Sequelize

const PORT = process.env.PARKING_PORT || 4003; // this service's port (gateway proxies here)

// Async startup so each step can await the previous one; order matters: DB before listening
(async () => {
  try {
    await connectDB();                   // 1) verify the database is reachable
    await sequelize.sync();              // 2) create/align the parkings table from the model
    logger.info('[parking-service] Models synchronised');
    // 3) only start accepting requests once the DB is ready
    app.listen(PORT, () => logger.info(`[parking-service] running on http://localhost:${PORT} (docs at /docs)`));
  } catch (err) {
    logger.error(`[parking-service] startup failed: ${err.message}`);
    process.exit(1);                     // can't run without the DB -> exit so the process manager notices
  }
})();

// Safety net: log promise rejections that weren't caught anywhere, instead of crashing silently
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
