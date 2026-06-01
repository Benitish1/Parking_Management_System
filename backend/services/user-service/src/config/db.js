/*
 * config/db.js — Sequelize (PostgreSQL) connection for the user-service.
 * All 7 microservices share ONE Postgres database; this service uses the same
 * `users` table as the auth-service, so reads/writes here are visible there too.
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * Shared PostgreSQL connection for the User microservice.
 * Points to the same DB as auth-service (shared `users` table).
 * Credentials/host come from env vars with sensible local-dev defaults.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || 'parking_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg), // send Sequelize's SQL to the debug log instead of console
    // Connection pool: reuse up to 10 connections; tune acquire/idle timeouts (ms)
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
);

// Verify the DB is reachable at startup; throws if credentials/host are wrong so server.js can fail fast
const connectDB = async () => {
  await sequelize.authenticate();
  logger.info('[user-service] PostgreSQL connection established');
};

module.exports = { sequelize, connectDB };
