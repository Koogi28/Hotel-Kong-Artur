// Datalag: værelsestyper og deres priser pr. sæson (FR-008).
const pool = require('../db');

async function findByName(name) {
  const [rows] = await pool.query(
    'SELECT id, name, price_low, price_mid, price_high FROM room_type WHERE name = ?',
    [name],
  );
  return rows[0] || null;
}

async function findAll() {
  const [rows] = await pool.query(
    'SELECT id, name, price_low, price_mid, price_high FROM room_type ORDER BY id',
  );
  return rows;
}

module.exports = { findByName, findAll };
