// Præsentationslag: /api/bar. Kun HTTP ind/ud – kalder barService og sender svaret.
// Fejl sendes videre med next(err) til fejl-middlewaren i app.js.
const barService = require('../services/barService');

async function listDrinks(req, res, next) {
  try {
    res.json(await barService.listDrinks());
  } catch (err) {
    next(err);
  }
}

module.exports = { listDrinks };
