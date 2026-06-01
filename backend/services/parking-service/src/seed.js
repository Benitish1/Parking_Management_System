// ---------------------------------------------------------------------------
// seed.js — One-off script to populate the database with starter parking lots.
// WHAT: connects, syncs the table, then inserts a few demo parkings if missing.
// WHY:  gives the app realistic data to work with right after setup; run manually
//       (e.g. `node src/seed.js`), NOT as part of the running server.
// ---------------------------------------------------------------------------
require('dotenv').config();              // load DB credentials / secrets from .env
const { connectDB, sequelize } = require('./config/db');
const Parking = require('./models/Parking');
const logger = require('./config/logger');

// Demo parking lots to insert (Kigali locations with varying capacity/occupancy)
const seedParkings = [
  {
    code: 'PK001',
    parkingName: 'Kigali Heights Parking',
    totalSpaces: 120,
    availableSpaces: 120,
    location: 'KG 7 Ave, Kigali',
    chargingFeePerHour: 500,
  },
  {
    code: 'PK002',
    parkingName: 'Nyabugogo Bus Park',
    totalSpaces: 200,
    availableSpaces: 185,
    location: 'Nyabugogo, Nyarugenge',
    chargingFeePerHour: 300,
  },
  {
    code: 'PK003',
    parkingName: 'Kigali City Tower',
    totalSpaces: 80,
    availableSpaces: 40,
    location: 'KN 2 St, CBD',
    chargingFeePerHour: 700,
  },
  {
    code: 'PK004',
    parkingName: 'Remera Stadium Lot',
    totalSpaces: 150,
    availableSpaces: 150,
    location: 'Remera, Gasabo',
    chargingFeePerHour: 400,
  },
];

// Self-invoking async function so we can use await at the top level of the script
(async () => {
  try {
    await connectDB();                   // open the DB connection
    await sequelize.sync();              // make sure the parkings table exists
    for (const p of seedParkings) {
      // findOrCreate is idempotent: insert only if a lot with this code isn't already there,
      // so re-running the seed won't create duplicates.
      const [parking, created] = await Parking.findOrCreate({ where: { code: p.code }, defaults: p });
      logger.info(`${created ? 'Created' : 'Exists'} parking: ${parking.code} — ${parking.parkingName}`);
    }
    logger.info('Parking seed complete.');
    process.exit(0);                     // exit 0 = success
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);                     // exit 1 = failure (signals the error to the shell)
  }
})();
