/**
 * db.js — Database connection for the REPORT-SERVICE.
 * WHY: All 7 microservices share ONE PostgreSQL database. This service only
 *      READS the parking/car-entry tables to build reports, so the env values
 *      point at the same shared DB as the other services.
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * Shared PostgreSQL connection for the Report microservice.
 * Read-only access to the shared parking database.
 */
// Credentials come from env vars (with safe local defaults) so the same code
// runs in dev and production without changes.
const sequelize = new Sequelize(
  process.env.DB_NAME || 'parking_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg), // route Sequelize's SQL logs through Winston (debug only)
    // Connection pool: reuse up to 10 connections instead of opening one per query
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

// Verify the DB is reachable at startup; throws (and stops boot) if it cannot connect.
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('[report-service] PostgreSQL connection established');
};

module.exports = { sequelize, connectDB };
