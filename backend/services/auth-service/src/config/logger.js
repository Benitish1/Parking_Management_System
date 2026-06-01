/*
 * config/logger.js — Centralised Winston logger for the auth-service.
 * Writes timestamped logs to rotating files (error/combined/auth) and, in
 * non-production, also prints colourised logs to the console. Using one shared
 * logger keeps log formatting consistent across the whole service.
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs/ directory exists before Winston tries to write files into it
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom line format: "<time> [auth-service] <level>: <message or stack trace>"
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [auth-service] ${level}: ${stack || message}`; // prefer full stack trace when the log is an Error
});

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // verbose in dev, quieter in prod
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }), // errors only
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }), // everything
    new winston.transports.File({ filename: path.join(logDir, 'auth.log'), level: 'info' }), // info+ for general activity
  ],
});

// Outside production, also log to the terminal with colours for easier local debugging
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
