/*
 * Swagger / OpenAPI configuration for the notification service.
 * swagger-jsdoc scans the route files for special @swagger JSDoc comments and
 * turns them into a machine-readable API spec. app.js then serves that spec as
 * interactive docs at /docs and as raw JSON at /docs.json.
 */
const swaggerJsdoc = require('swagger-jsdoc');

module.exports = swaggerJsdoc({
  definition: {
    openapi: '3.0.0', // OpenAPI spec version
    info: {
      title: 'XWZ Parking — Notification Service API',
      version: '1.0.0',
      description: 'Notification microservice: OTP and transactional email delivery via Nodemailer.',
    },
    servers: [
      // Points at the service directly (port 4006), not through the gateway, so
      // the "Try it out" buttons in the docs hit this service's own URL.
      { url: 'http://localhost:4006', description: 'Direct (notification-service)' },
    ],
  },
  apis: ['./src/routes/*.js'], // files to scan for @swagger annotations
});
