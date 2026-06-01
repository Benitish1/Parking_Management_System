/*
 * seed.js — One-off script to insert default accounts for development/demo.
 * Run manually (e.g. `node src/seed.js`). It connects to the DB, ensures tables
 * exist, and creates a ready-to-use admin + attendant (both pre-verified) so you
 * can log in immediately without going through the OTP flow.
 */
require('dotenv').config(); // load DB/JWT settings from .env
const { connectDB, sequelize } = require('./config/db');
const User = require('./models/User');
const logger = require('./config/logger');

// Default accounts to create; isVerified:true skips OTP so they can log in right away
const seedUsers = [
  { firstName: 'System', lastName: 'Admin', email: 'admin@xwz.rw', password: 'Admin123!', role: 'admin', isVerified: true },
  { firstName: 'Jean', lastName: 'Bosco', email: 'attendant@xwz.rw', password: 'Attend123!', role: 'attendant', isVerified: true },
];

// IIFE so we can use async/await at the top level of this script
(async () => {
  try {
    await connectDB(); // verify DB connection
    await sequelize.sync(); // make sure the users table exists
    for (const u of seedUsers) {
      // findOrCreate is idempotent — re-running the seed won't create duplicates
      const [user, created] = await User.findOrCreate({ where: { email: u.email }, defaults: u });
      logger.info(`${created ? 'Created' : 'Exists'} user: ${user.email} (${user.role})`);
    }
    logger.info('Auth seed complete.');
    process.exit(0); // success exit code
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1); // non-zero exit signals failure to the shell/CI
  }
})();
