// ---------------------------------------------------------------------------
// docs/swagger.js — Builds the OpenAPI (Swagger) spec for this service.
// WHAT: swagger-jsdoc scans the route files for /** @swagger */ JSDoc blocks
//       and merges them with the base definition below into one spec object.
// WHY:  gives us auto-generated, always-up-to-date interactive API docs at /docs.
// ---------------------------------------------------------------------------
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'XWZ Parking — Parking Service API',
      version: '1.0.0',
      description: 'Parking lots microservice: create, list, update, delete parking lots and manage space occupancy.',
    },
    // Two base URLs: hitting the service directly (4003) or through the API gateway (4000)
    servers: [
      { url: 'http://localhost:4003', description: 'Direct (parking-service)' },
      { url: 'http://localhost:4000', description: 'Via API Gateway' },
    ],
    components: {
      // Declares JWT Bearer auth so the docs UI shows an "Authorize" button
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'],           // glob telling swagger-jsdoc where to find the @swagger comments
};

module.exports = swaggerJsdoc(options); // export the compiled spec consumed by app.js
