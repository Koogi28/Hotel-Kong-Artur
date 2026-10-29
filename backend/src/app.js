// Opsætning af Express-appen: JSON, statisk frontend, Swagger UI, routes og fejlhåndtering.
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const routes = require('./routes');
const { ValidationError, NotFoundError, ConflictError } = require('./services/errors');

// OpenAPI-kontrakten findes kun ét sted: specs/.../contracts/openapi.yaml (plan: én kilde).
// I Docker kopieres den til /app/openapi.yaml, og stien gives via OPENAPI_PATH.
const openApiPath = process.env.OPENAPI_PATH
  || path.join(__dirname, '..', '..', 'specs', '001-booking-kpi-bar', 'contracts', 'openapi.yaml');
const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use(routes);

// Ukendt /api-sti → JSON-404 (princip III)
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint findes ikke' });
});

// Fejlhåndtering: alle fejl sendes som JSON.
// Express kender en fejl-middleware på, at den har fire parametre, så `next` skal stå der.
// Fejlklasserne fra services/errors.js bliver til 400/404/409. Alt andet er 500.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Body er ikke gyldig JSON' });
  }
  if (err instanceof ValidationError) {
    return res.status(400).json({ error: err.message, fields: err.fields });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  console.error(err);
  res.status(500).json({ error: 'Intern fejl' });
});

module.exports = app;
