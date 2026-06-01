/*
 * Mailer service — the only place that actually talks to an email server.
 * Uses Nodemailer over SMTP. Configured entirely from environment variables so
 * no credentials are hard-coded. Exposes sendMail() (used by the controllers)
 * and smtpConfigured (a flag the rest of the app uses to know the current mode).
 *
 * Key design choice: if SMTP isn't configured, emails are logged to the console
 * instead of failing — so the whole signup/OTP flow works in development without
 * needing a real mail account.
 */
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

let transporter = null; // the Nodemailer client; stays null when SMTP isn't set up
// Treat SMTP as "configured" only when BOTH credentials are present (!! coerces to boolean).
const smtpConfigured = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// Build the transporter once at startup (reused for every send) — but only if
// we actually have credentials, otherwise we run in console/dev mode.
if (smtpConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587, // 587 = standard STARTTLS submission port
    secure: Number(process.env.SMTP_PORT) === 465, // port 465 uses implicit TLS; others negotiate via STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, // login credentials from env
  });
}

/**
 * Send an email. In development with no SMTP credentials, the email
 * (including any OTP) is logged to the console instead of being sent —
 * so the signup → OTP flow is fully testable without a mail server.
 */
async function sendMail({ to, subject, html, text }) {
  // DEV MODE: no SMTP -> print the email (and any OTP) to the logs and report
  // mode 'console' so callers know it wasn't really delivered.
  if (!smtpConfigured) {
    logger.info(`\n────── DEV EMAIL (no SMTP configured) ──────\nTo: ${to}\nSubject: ${subject}\n${text || ''}\n───────────────────────────────────────────`);
    return { delivered: false, mode: 'console' };
  }
  // REAL MODE: hand the message to the SMTP server and await the result.
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'XWZ Parking <no-reply@xwzparking.rw>', // configurable sender, with a sensible default
    to,
    subject,
    text, // plain-text fallback for clients that don't render HTML
    html, // rich HTML version
  });
  logger.info(`Email sent to ${to} (id: ${info.messageId})`); // messageId helps trace the email later
  return { delivered: true, mode: 'smtp', messageId: info.messageId };
}

// Export the send function plus the mode flag so server.js can report status at boot.
module.exports = { sendMail, smtpConfigured };
