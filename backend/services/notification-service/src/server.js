/*
 * Entry point for the notification-service process.
 * Loads env vars, takes the configured Express app, and starts listening on the
 * service port (default 4006). On startup it also reports whether real SMTP is
 * configured, so a developer instantly knows if emails will be sent or just
 * logged to the console (dev mode).
 */
require('dotenv').config(); // load .env before any module reads process.env
const app = require('./app');
const logger = require('./config/logger');
const { smtpConfigured } = require('./services/mailer'); // true only if SMTP_USER + SMTP_PASS are set

const PORT = process.env.NOTIFICATION_PORT || 4006; // configurable port, defaults to 4006

app.listen(PORT, () => {
  logger.info(`[notification-service] running on http://localhost:${PORT} (docs at /docs)`);
  // Make the email-sending mode obvious in the logs at boot so it's never a surprise.
  logger.info(`[notification-service] SMTP ${smtpConfigured ? 'configured — emails will be sent' : 'NOT configured — OTPs will be logged to console (dev mode)'}`);
});

// Catch unhandled promise rejections so they're logged rather than crashing silently.
process.on('unhandledRejection', (reason) => logger.error(`Unhandled Rejection: ${reason}`));
