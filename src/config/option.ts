const swaggerOption = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WFS",
      version: "1.1.0",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}/api/v1`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },

  apis: ["src/routes/v1/*.ts"],
};
export { swaggerOption };
