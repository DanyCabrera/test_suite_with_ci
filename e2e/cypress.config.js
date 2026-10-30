const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    supportFile: false,
    specPattern: "cypress/e2e/**/*.cy.js",
    video: false,
  },
  env: {
    apiUrl: "http://localhost:8000",
    barberEmail: "barbero1@example.com",
    barberPassword: "barber-dev-pass",
  },
});
