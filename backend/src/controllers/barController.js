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

async function createSale(req, res, next) {
  try {
    res.status(201).json(await barService.registerSale(req.body));
  } catch (err) {
    next(err);
  }
}

async function total(req, res, next) {
  try {
    res.json(await barService.getTotal());
  } catch (err) {
    next(err);
  }
}

async function revenueByDrink(req, res, next) {
  try {
    res.json(await barService.getRevenueByDrink());
  } catch (err) {
    next(err);
  }
}

async function categorySplit(req, res, next) {
  try {
    res.json(await barService.getCategorySplit());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDrinks,
  createSale,
  total,
  revenueByDrink,
  categorySplit,
};
