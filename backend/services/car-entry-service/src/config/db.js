/**
 * config/db.js — Sequelize (PostgreSQL) connection for the Car Entry Service.
 *
 * WHY: All XWZ microservices share ONE Postgres database, so each service owns
 *      its own Sequelize instance pointed at the same DB. Defaults let it run
 *      locally without a .env; env vars override them in real deployments.
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * Shared PostgreSQL connection for the Car Entry microservice.
 * Uses the same database as the rest of the XWZ Parking system.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || 'parking_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg), // route raw SQL to the debug log instead of console
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }, // connection pool: reuse up to 10 connections, close idle ones
  }
);

// Verify the DB is reachable at startup; throws if credentials/host are wrong
// so server.js can fail fast instead of serving requests with a dead connection.
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('[car-entry-service] PostgreSQL connection established');
};

module.exports = { sequelize, connectDB };
