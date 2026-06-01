/*
 * Route table mapping public path prefixes to downstream microservices.
 *
 * app.js loops over this array to build one proxy per entry, so adding/moving a
 * service is just editing this list — no other gateway code changes needed.
 * Each `target` reads from an env var first (so deployments can point at real
 * hostnames) and falls back to the local dev port if the var is unset.
 *   prefix = the public URL path clients use
 *   target = where the gateway forwards that prefix
 *   name   = human-readable label used in logs and error messages
 */
module.exports = [
  { prefix: '/api/auth', target: process.env.AUTH_SERVICE_URL || 'http://localhost:4001', name: 'auth-service' }, // login/signup/OTP
  { prefix: '/api/users', target: process.env.USER_SERVICE_URL || 'http://localhost:4002', name: 'user-service' }, // user profiles/management
  { prefix: '/api/parkings', target: process.env.PARKING_SERVICE_URL || 'http://localhost:4003', name: 'parking-service' }, // parking lots/slots
  { prefix: '/api/car-entries', target: process.env.CARENTRY_SERVICE_URL || 'http://localhost:4004', name: 'car-entry-service' }, // vehicle entry/exit records
  { prefix: '/api/reports', target: process.env.REPORT_SERVICE_URL || 'http://localhost:4005', name: 'report-service' }, // analytics/reporting
  { prefix: '/api/notifications', target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4006', name: 'notification-service' }, // OTP/transactional email
];
