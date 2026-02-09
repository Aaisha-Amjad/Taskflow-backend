// Swagger/OpenAPI configuration
// This defines how our API documentation will look and behave

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

//Basic API information shown at the top of swagger UI
const swaggerDefinition = {
  openapi: "3.0.0", //OpenAPI versionn (standard format)
  info: {
    title: "TaskFlow API", // Name shown in docs
    version: "1.0.0", // Your API version
    description: "Collaborative task management system with real time update",
    contact: {
      name: "API support",
      email: "support@taskflow.com",
    },
  },
  servers: [
    {
      url: "http://localhost:3000", //Base URL for testing
      description: "Development server",
    },
  ],
  // Define security scheme (JWT authentication)
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT", //token format
        description: "Enter your JWT token from /api/auth/login",
      },
    },
  },

  //Apply JWT auth to all endpoints by default
  security: [
    {
      bearerAuth: [],
    },
  ],
};

//Options tell swagger-jsdoc where to find API documentation comments
const options = {
  swaggerDefinition,
  //Look for @swagger comments in all route files
  apis: ["./src/routes/*.js"],
};

// Generate  the swagger specification from our comments
const swaggerSpec = swaggerJsdoc(options);

// Export setup function that app.js with call
const setupSwagger = (app) => {
  // Serve swagger UI at /api-docs
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📚 Swagger docs available at http://localhost:3000/api-docs");
};

module.exports = setupSwagger;
