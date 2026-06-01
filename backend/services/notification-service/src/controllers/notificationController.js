/*
 * Controllers for the notification routes.
 * A controller holds the logic that runs once a request has passed validation:
 * here, building the email content and handing it to the mailer to send.
 * The routes are validated upstream (notificationRoutes.js + validate middleware),
 * so these handlers can trust that required fields are present.
 */
const { sendMail } = require('../services/mailer'); // actually delivers (or dev-logs) the email
const otpEmail = require('../templates/otpEmail'); // builds the OTP email's text + HTML
const { success, error } = require('../utils/response'); // standard {success, message, data} envelope
const logger = require('../config/logger');

// POST /api/notifications/otp — called by auth-service to email a verification code.
// Takes the recipient + OTP, renders the branded template, and sends it.
exports.sendOtp = async (req, res, next) => {
  try {
    const { to, name, otp, purpose } = req.body; // already validated: `to` is an email, `otp` is present
    const { text, html } = otpEmail({ name, otp, purpose }); // render both plain-text and HTML versions
    const result = await sendMail({
      to,
      subject: `${otp} is your XWZ Parking verification code`, // putting the code in the subject helps users find it fast
      text,
      html,
    });
    logger.info(`OTP email processed for ${to} (mode: ${result.mode})`); // mode = 'smtp' (sent) or 'console' (dev-logged)
    return success(res, { message: 'OTP email processed', data: result });
  } catch (err) {
    next(err); // forward any failure to the central errorHandler instead of crashing
  }
};

// POST /api/notifications/email — generic transactional email.
// Lets other services send arbitrary subject/body emails through this service.
exports.sendEmail = async (req, res, next) => {
  try {
    const { to, subject, html, text } = req.body; // validated: `to` is an email, `subject` is present
    const result = await sendMail({ to, subject, html, text }); // caller supplies the body, so no template here
    return success(res, { message: 'Email processed', data: result });
  } catch (err) {
    next(err); // delegate error handling to the middleware
  }
};
