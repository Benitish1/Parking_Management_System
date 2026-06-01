/*
 * docs/swagger.js — Builds the OpenAPI (Swagger) specification for this service.
 * swagger-jsdoc scans the JSDoc @swagger comments in the route files and turns
 * them into a spec object that app.js serves at /docs (UI) and /docs.json (raw).
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0', // OpenAPI version this spec conforms to
    info: {
      title: 'XWZ Parking — Auth Service API',
      version: '1.0.0',
      description: 'Authentication microservice: signup, OTP verification, login, JWT issuing.',
    },
    // Two ways to reach the API: directly on 4001, or through the gateway on 4000
    servers: [
      { url: 'http://localhost:4001', description: 'Direct (auth-service)' },
      { url: 'http://localhost:4000', description: 'Via API Gateway' },
    ],
    components: {
      securitySchemes: {
        // Declares JWT bearer auth so the docs show an "Authorize" button for protected routes
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.js'], // files swagger-jsdoc scans for @swagger annotations
};

// Export the generated spec object for app.js to serve
module.exports = swaggerJsdoc(options);
