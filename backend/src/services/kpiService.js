// Forretningslag: nøgletal. Henter råe rækker fra repositories og beregner med kpiCalculations.
// Tallene beregnes ved hvert kald, så nye bookinger og salg vises med det samme (princip V).
// Alle svar er flade (objekt eller array af objekter), så Tableau kan læse dem (research R7).
const bookingRepository = require('../repositories/bookingRepository');
const drinkRepository = require('../repositories/drinkRepository');
const roomTypeRepository = require('../repositories/roomTypeRepository');
const kpiCalculations = require('./kpiCalculations');
const { withUnitsSold } = require('./barCalculations');
const { isValidDate } = require('./bookingRules');
const { ValidationError } = require('./errors');

async function getTotal() {
  return kpiCalculations.totalRevenue(await bookingRepository.findRevenueRows());
}

async function getRevenueByCountry() {
  return kpiCalculations.revenueBy(await bookingRepository.findRevenueRows(), 'country');
}

async function getRevenueByRoomType() {
  return kpiCalculations.revenueBy(await bookingRepository.findRevenueRows(), 'room_type');
}

async function getRevenueBySeason() {
  return kpiCalculations.revenueBy(await bookingRepository.findRevenueRows(), 'season');
}

// Værelsestyperne hentes fra databasen, så alle 8 kommer med, også uden bookinger.
async function getRevenueByRoomTypeSeason() {
  const [rows, roomTypes] = await Promise.all([
    bookingRepository.findRevenueRows(),
    roomTypeRepository.findAll(),
  ]);
  return kpiCalculations.revenueByRoomTypeSeason(rows, roomTypes.map((roomType) => roomType.name));
}

// Dato tjekkes før databasen kaldes, så fx 2026-13-01 giver 400 og ikke 500.
async function getOccupancy(date) {
  if (!isValidDate(date)) {
    throw new ValidationError('Ugyldige felter: date skal være en gyldig dato (YYYY-MM-DD)', ['date']);
  }
  return kpiCalculations.occupancyForDate(await bookingRepository.findDatedStays(), date);
}

async function getOccupancyPerNight() {
  return kpiCalculations.occupancyPerNight(await bookingRepository.findDatedStays());
}

// Historiske enheder + registrerede salg, så nye barsalg også tæller med (FR-019).
async function getTopDrinks() {
  const rows = withUnitsSold(await drinkRepository.findAllWithRegisteredUnits());
  return kpiCalculations.topDrinks(rows);
}

module.exports = {
  getTotal,
  getRevenueByCountry,
  getRevenueByRoomType,
  getRevenueBySeason,
  getRevenueByRoomTypeSeason,
  getOccupancy,
  getOccupancyPerNight,
  getTopDrinks,
};
