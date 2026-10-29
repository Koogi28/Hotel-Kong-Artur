// Datalag: barens menu (30 drinks fra seed) og registrerede salg pr. drink.
// `price` er DECIMAL og kommer som streng ("91.40"). Omregning til øre sker i services (research R8).
const pool = require('../db');

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, name, category, price FROM drink ORDER BY category, name',
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, category, price FROM drink WHERE id = ?',
    [id],
  );
  return rows[0] || null;
}

// Alle drinks med historiske enheder og summen af registrerede salg.
// LEFT JOIN, så drinks uden salg også kommer med (registered_units = 0).
async function findAllWithRegisteredUnits() {
  const [rows] = await pool.query(
    `SELECT drink.id, drink.name, drink.category, drink.price, drink.historical_units_sold,
            COALESCE(SUM(bar_sale.quantity), 0) AS registered_units
       FROM drink
       LEFT JOIN bar_sale ON bar_sale.drink_id = drink.id
      GROUP BY drink.id
      ORDER BY drink.category, drink.name`,
  );
  return rows;
}

module.exports = { findAll, findById, findAllWithRegisteredUnits };
