/**
 * docs/swagger.js — generates the OpenAPI spec for this service.
 *
 * WHY: swagger-jsdoc scans the JSDoc @swagger comments in the route files and
 *      builds an OpenAPI document, which app.js serves at /docs and /docs.json.
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XWZ Parking — Car Entry Service API',
      version: '1.0.0',
      description: 'Car Entry microservice: register entries, exits, retrieve tickets and bills.',
    },
    servers: [
      // Two ways to reach this API: directly, or proxied through the gateway.
      { url: 'http://localhost:4004', description: 'Direct (car-entry-service)' },
      { url: 'http://localhost:4000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        // Declares JWT Bearer auth so the docs UI can attach a token to requests.
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'], // files swagger-jsdoc scans for @swagger annotations
};

module.exports = swaggerJsdoc(options);
