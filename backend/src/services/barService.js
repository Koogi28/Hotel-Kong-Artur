// Forretningslag: baren. Henter data via drinkRepository og former svarene efter kontrakten.
const drinkRepository = require('../repositories/drinkRepository');

// Menuen sorteret efter kategori og navn. `price` kommer som DECIMAL-streng ("91.40")
// fra MySQL, men kontrakten siger number.
async function listDrinks() {
  const rows = await drinkRepository.findAll();
  return rows.map((row) => ({ ...row, price: Number(row.price) }));
}

module.exports = { listDrinks };
