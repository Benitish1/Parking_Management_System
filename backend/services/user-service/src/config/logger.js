/*
 * config/logger.js — Winston logger for the user-service.
 * Writes timestamped, service-tagged logs to files (and to a colourised console in dev)
 * so admin actions and errors are traceable. Shared by app.js, controllers and middleware.
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs/ directory exists before Winston tries to write files (avoids ENOENT on first run)
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom line format; prints the error stack when present, otherwise the plain message
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [user-service] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  // Quieter in production (info+), verbose in dev (debug+) to aid local troubleshooting
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  // errors({ stack: true }) captures stack traces so thrown Errors log usefully
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  // Separate files by purpose: errors only, everything combined, and info-level user activity
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'user.log'), level: 'info' }),
  ],
});

// Only log to the console outside production (keeps prod logs file-based and machine-parseable)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
