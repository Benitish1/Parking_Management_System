/*
 * docs/swagger.js — builds the OpenAPI 3 spec for this service.
 * swagger-jsdoc scans the route files for @swagger JSDoc blocks and merges them
 * with the base definition below; app.js then serves the result at /docs.
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0', // OpenAPI spec version
    info: {
      title: 'XWZ Parking — User Service API',
      version: '1.0.0',
      description: 'Admin user-management microservice: list, create, update, delete users and view dashboard stats.',
    },
    // Two base URLs: hitting the service directly (4002) or through the gateway (4000)
    servers: [
      { url: 'http://localhost:4002', description: 'Direct (user-service)' },
      { url: 'http://localhost:4000', description: 'Via API Gateway' },
    ],
    components: {
      // Declares JWT Bearer auth so the docs UI shows an "Authorize" button and routes can require it
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'], // files swagger-jsdoc parses for @swagger annotations
};

module.exports = swaggerJsdoc(options); // the generated spec object consumed by swagger-ui-express
