/*
 * Centralized logger for the API gateway, built with winston.
 * Every other gateway file imports this single instance so all logs share one
 * format and land in the same files. Tagged "[api-gateway]" so logs are easy to
 * tell apart from the other services when reading them.
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Logs are written to a sibling "logs" folder; create it on first run if missing
// (recursive:true makes mkdir safe even if parent folders don't exist yet).
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize } = winston.format;
// Define how each line looks: "<time> [api-gateway] <level>: <message>".
const logFormat = printf(({ level, message, timestamp }) => `${timestamp} [api-gateway] ${level}: ${message}`);

const logger = winston.createLogger({
  // In production keep logs lean (info+); in dev show everything down to debug.
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }), // errors only, for quick triage
    new winston.transports.File({ filename: path.join(logDir, 'gateway.log') }), // everything (full history)
  ],
});

// Outside production, also print colored logs to the console for easier debugging.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
