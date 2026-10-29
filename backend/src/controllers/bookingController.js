// Præsentationslag: /api/bookings. Kun HTTP ind/ud – læser params/body, kalder bookingService
// og sætter status. Ingen SQL og ingen beregninger.
// Express 4 fanger ikke fejl fra async-funktioner selv, så de sendes videre med next(err)
// til fejl-middlewaren i app.js, der laver dem om til 400/404/409.
const bookingService = require('../services/bookingService');

async function list(req, res, next) {
  try {
    res.json(await bookingService.list(req.query.search));
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    res.json(await bookingService.get(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const booking = await bookingService.create(req.body);
    res.status(201).location(`/api/bookings/${booking.id}`).json(booking);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await bookingService.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await bookingService.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove };
