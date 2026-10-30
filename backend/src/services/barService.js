// Forretningslag: baren. Henter data via repositories og former svarene efter kontrakten.
// Nøgletallene beregnes i barCalculations ud fra historiske + registrerede salg (princip V, VIII).
const drinkRepository = require('../repositories/drinkRepository');
const barSaleRepository = require('../repositories/barSaleRepository');
const barCalculations = require('./barCalculations');
const { ValidationError } = require('./errors');

// Forklaring pr. felt til fejlbeskeden, ligesom i bookingService (FR-005).
const FIELD_ERRORS = {
  drink_id: 'drink_id skal være id på en drikkevare fra menuen',
  quantity: 'quantity skal være et helt tal mellem 1 og 1000',
};

function validationError(fields) {
  const reasons = fields.map((field) => FIELD_ERRORS[field]).join('; ');
  return new ValidationError(`Ugyldige felter: ${reasons}`, fields);
}

// Menuen sorteret efter kategori og navn. `price` kommer som DECIMAL-streng ("91.40")
// fra MySQL, men kontrakten siger number.
async function listDrinks() {
  const rows = await drinkRepository.findAll();
  return rows.map((row) => ({ ...row, price: Number(row.price) }));
}

// FR-022, FR-023: ét salg. Ukendt drink giver 400 (ikke 404), fordi fejlen ligger i body.
async function registerSale(body) {
  const fields = barCalculations.validateSaleInput(body);
  if (fields.length > 0) {
    throw validationError(fields);
  }
  if (!(await drinkRepository.findById(body.drink_id))) {
    throw validationError(['drink_id']);
  }
  const id = await barSaleRepository.create({ drink_id: body.drink_id, quantity: body.quantity });
  return barSaleRepository.findById(id);
}

// Alle drinks med units_sold = historiske + registrerede enheder (research R9).
async function drinksWithUnitsSold() {
  return barCalculations.withUnitsSold(await drinkRepository.findAllWithRegisteredUnits());
}

// FR-024
async function getTotal() {
  return barCalculations.barTotal(await drinksWithUnitsSold());
}

// FR-025
async function getRevenueByDrink() {
  return barCalculations.revenueByDrink(await drinksWithUnitsSold());
}

// FR-026
async function getCategorySplit() {
  return barCalculations.categorySplit(await drinksWithUnitsSold());
}

module.exports = {
  listDrinks,
  registerSale,
  getTotal,
  getRevenueByDrink,
  getCategorySplit,
};
