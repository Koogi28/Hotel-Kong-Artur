// Starter backend-serveren.
const app = require('./app');

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`Backend kører på http://localhost:${port} (Swagger UI: /api-docs)`);
});
