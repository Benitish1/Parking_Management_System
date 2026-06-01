/**
 * config/logger.js — Winston logger shared by the whole service.
 *
 * WHY: Centralising logging gives consistent, timestamped, service-tagged output
 *      to both files (for auditing) and the console (for local dev), instead of
 *      scattered console.log calls.
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs/ directory exists before Winston tries to write to it.
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom line format; `stack || message` prints full stack traces for Error objects.
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [car-entry-service] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  // Quieter in production (info+), verbose in dev (debug+) for easier troubleshooting.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    // Separate files by severity so errors are easy to find amid normal traffic.
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'car-entry.log'), level: 'info' }),
  ],
});

// Only log to the terminal outside production (coloured, short timestamps for readability).
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
