// Præsentationslag: /api/kpi. Kun HTTP ind/ud – kalder kpiService og sender svaret.
// Fejl sendes videre med next(err) til fejl-middlewaren i app.js (ugyldig dato → 400).
const kpiService = require('../services/kpiService');

async function revenueTotal(req, res, next) {
  try {
    res.json(await kpiService.getTotal());
  } catch (err) {
    next(err);
  }
}

async function revenueByCountry(req, res, next) {
  try {
    res.json(await kpiService.getRevenueByCountry());
  } catch (err) {
    next(err);
  }
}

async function revenueByRoomType(req, res, next) {
  try {
    res.json(await kpiService.getRevenueByRoomType());
  } catch (err) {
    next(err);
  }
}

async function revenueBySeason(req, res, next) {
  try {
    res.json(await kpiService.getRevenueBySeason());
  } catch (err) {
    next(err);
  }
}

async function revenueByRoomTypeSeason(req, res, next) {
  try {
    res.json(await kpiService.getRevenueByRoomTypeSeason());
  } catch (err) {
    next(err);
  }
}

async function occupancy(req, res, next) {
  try {
    res.json(await kpiService.getOccupancy(req.query.date));
  } catch (err) {
    next(err);
  }
}

async function occupancyNights(req, res, next) {
  try {
    res.json(await kpiService.getOccupancyPerNight());
  } catch (err) {
    next(err);
  }
}

async function topDrinks(req, res, next) {
  try {
    res.json(await kpiService.getTopDrinks());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  revenueTotal,
  revenueByCountry,
  revenueByRoomType,
  revenueBySeason,
  revenueByRoomTypeSeason,
  occupancy,
  occupancyNights,
  topDrinks,
};
