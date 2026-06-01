/*
 * Centralized winston logger for the notification service.
 * Shared by every file here so logs share one format and destination. Tagged
 * "[notification-service]" to distinguish it from the other services' logs.
 * Unlike the gateway logger, this one also captures error stack traces (see errors()).
 */
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure the logs folder exists before winston tries to write to it.
const logDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const { combine, timestamp, printf, colorize, errors } = winston.format;
// Print the stack trace when present (errors), otherwise the plain message.
const logFormat = printf(({ level, message, timestamp, stack }) => `${timestamp} [notification-service] ${level}: ${stack || message}`);

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', // quieter in prod, verbose in dev
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat), // errors({stack:true}) attaches stack traces
  transports: [
    new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }), // errors only
    new winston.transports.File({ filename: path.join(logDir, 'combined.log') }), // all levels
  ],
});

// In dev, also mirror logs to the console (colored) for convenience.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({ format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat) }));
}

module.exports = logger;
