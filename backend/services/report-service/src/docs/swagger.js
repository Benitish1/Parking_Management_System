/**
 * swagger.js — Builds the OpenAPI spec for the report-service.
 * WHY: swagger-jsdoc scans the JSDoc @swagger blocks in the route files and
 *      generates interactive API docs (served at /docs), so the spec stays in
 *      sync with the actual routes instead of being maintained by hand.
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XWZ Parking — Report Service API',
      version: '1.0.0',
      description: 'Report microservice: analytics, revenue, occupancy and paginated car entry reports (admin only).',
    },
    // Two ways to reach this service: directly on 4005, or through the gateway on 4000.
    servers: [
      { url: 'http://localhost:4005', description: 'Direct (report-service)' },
      { url: 'http://localhost:4000', description: 'Via API Gateway' },
    ],
    components: {
      // Declares JWT Bearer auth so the docs show an "Authorize" button.
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'], // files to scan for @swagger annotations
};

// Compile the annotations into a finished OpenAPI spec object.
module.exports = swaggerJsdoc(options);
