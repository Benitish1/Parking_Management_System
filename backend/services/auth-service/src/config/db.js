/*
 * config/db.js — Database connection for the auth-service.
 * Creates the Sequelize instance that maps the User model to PostgreSQL.
 * Every microservice in this system points at the SAME shared Postgres DB,
 * with credentials read from environment variables (with sensible defaults).
 */
const { Sequelize } = require('sequelize');
const logger = require('./logger');

/**
 * Shared PostgreSQL connection for the Auth microservice.
 * SQLite is intentionally NOT used anywhere in this system.
 */
const sequelize = new Sequelize(
  process.env.DB_NAME || 'parking_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres', // use the PostgreSQL driver
    logging: (msg) => logger.debug(msg), // route SQL logs to Winston (debug level) instead of console
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }, // connection pool: up to 10 connections, reused/released over time
  }
);

// Verify the DB is reachable on startup; throws if credentials/host are wrong
const connectDB = async () => {
  await sequelize.authenticate(); // performs a test connection without running queries
  logger.info('[auth-service] PostgreSQL connection established');
};

module.exports = { sequelize, connectDB };
