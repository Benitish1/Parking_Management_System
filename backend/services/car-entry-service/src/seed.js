/**
 * seed.js — one-off script to insert sample car entries for testing/demo.
 *
 * WHY: Gives the database a couple of "currently parked" cars so the UI/API have
 *      data to show without manually registering entries. Run via `npm run seed`.
 */
require('dotenv').config(); // load DB credentials from .env before connecting
const { connectDB, sequelize } = require('./config/db');
const CarEntry = require('./models/CarEntry');
const logger = require('./config/logger');

/**
 * Sample seed data — a couple of parked entries.
 * Does NOT call the parking service; uses findOrCreate to be idempotent.
 * Run with: npm run seed
 */
const seedEntries = [
  {
    plateNumber: 'RAB001A',
    parkingCode: 'PK002',
    entryDateTime: new Date(Date.now() - 90 * 60 * 1000), // 90 min ago
    status: 'parked',
    chargedAmount: 0,
  },
  {
    plateNumber: 'RAC222B',
    parkingCode: 'PK003',
    entryDateTime: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    status: 'parked',
    chargedAmount: 0,
  },
];

// Self-invoking async function so we can use await at the top level of the script.
(async () => {
  try {
    await connectDB(); // open DB connection
    await sequelize.sync(); // ensure the car_entries table exists

    for (const data of seedEntries) {
      // findOrCreate makes this idempotent: re-running won't create duplicates —
      // it only inserts (using `defaults`) when no matching plate+status row exists.
      const [entry, created] = await CarEntry.findOrCreate({
        where: { plateNumber: data.plateNumber, status: 'parked' },
        defaults: data,
      });
      logger.info(`${created ? 'Created' : 'Exists'} entry: ${entry.plateNumber} @ ${entry.parkingCode}`);
    }

    logger.info('Car entry seed complete.');
    process.exit(0); // exit success so the script doesn't hang on the open connection
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1); // non-zero exit signals failure to npm/CI
  }
})();
