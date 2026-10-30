// Datalag: barsalg. Ét salg = én række (princip VIII). Altid ?-pladsholdere.
const pool = require('../db');

// sold_at udfyldes af databasen (DEFAULT CURRENT_TIMESTAMP, db kører med TZ=Europe/Copenhagen),
// så tidspunktet ikke afhænger af backendens ur (research R8). Returnerer det nye id.
async function create(sale) {
  const [result] = await pool.query(
    'INSERT INTO bar_sale (drink_id, quantity) VALUES (?, ?)',
    [sale.drink_id, sale.quantity],
  );
  return result.insertId;
}

// sold_at kommer som tekst ('2026-10-30 14:03:12'), fordi poolen bruger dateStrings.
async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, drink_id, quantity, sold_at FROM bar_sale WHERE id = ?',
    [id],
  );
  return rows[0] || null;
}

module.exports = { create, findById };
