// ---------------------------------------------------------------------------
// config/db.js — Sets up the Sequelize ORM connection to the shared PostgreSQL
// database that ALL microservices in this system use.
// WHY: centralising the connection here means the model and the rest of the
//      service import one ready-to-use `sequelize` instance.
// ---------------------------------------------------------------------------
const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * Shared PostgreSQL connection for the Parking microservice.
 * SQLite is intentionally NOT used anywhere in this system.
 */
// Read credentials from environment variables (with sensible local defaults) so
// the same code works in dev and production without hard-coding secrets.
const sequelize = new Sequelize(
  process.env.DB_NAME || 'parking_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),   // route Sequelize's SQL logs through Winston at debug level
    // Connection pool: reuse up to 10 connections; acquire/idle timeouts (ms) keep the pool healthy
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

// Verify the DB is reachable at startup; throws if credentials/host are wrong so the service won't boot blind
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('[parking-service] PostgreSQL connection established');
};

module.exports = { sequelize, connectDB };
