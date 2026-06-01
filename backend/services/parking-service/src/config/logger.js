// ---------------------------------------------------------------------------
// config/logger.js — Central Winston logger for the parking-service.
// WHAT: writes timestamped logs to rotating files (and the console in dev) so
//       we have a persistent record of activity and errors.
// WHY:  one shared logger keeps log format/labels consistent everywhere.
// ---------------------------------------------------------------------------
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs/ directory exists before Winston tries to write files into it
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom line format; prefer the full error stack when present, otherwise the plain message
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [parking-service] ${level}: ${stack || message}`;
});

const logger = winston.createLogger({
  // Quieter in production (info+); verbose (debug+) in dev for easier troubleshooting
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  // Separate files: errors-only, everything combined, and an info-level service log
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }),
    new winston.transports.File({ filename: path.join(logDir, 'parking.log'), level: 'info' }),
  ],
});

// Also print coloured logs to the terminal during development (not in production)
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
