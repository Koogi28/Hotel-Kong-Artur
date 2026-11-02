// Datalag: barsalg. Ét salg = én række (princip VIII). Altid $1, $2, ...-pladsholdere.
const pool = require('../db');

// sold_at udfyldes af databasen (DEFAULT LOCALTIMESTAMP(0) i forbindelsens tidszone
// Europe/Copenhagen, se db.js), så tidspunktet ikke afhænger af backendens ur (research R8 og R11).
// Returnerer det nye id.
async function create(sale) {
  const { rows } = await pool.query(
    'INSERT INTO bar_sale (drink_id, quantity) VALUES ($1, $2) RETURNING id',
    [sale.drink_id, sale.quantity],
  );
  return rows[0].id;
}

// sold_at kommer som tekst ('2026-10-30 14:03:12'), fordi db.js returnerer TIMESTAMP som tekst.
async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, drink_id, quantity, sold_at FROM bar_sale WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

module.exports = { create, findById };
