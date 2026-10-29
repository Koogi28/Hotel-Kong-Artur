// Datalag: bookinger. Al SQL for bookinger står her, altid med ?-pladsholdere,
// så brugerinput aldrig sættes direkte ind i SQL (beskytter mod SQL-injection).
const pool = require('../db');

// Felterne svarer til kontraktens Booking. room_type returneres som navn via JOIN.
const SELECT_BOOKING = `
  SELECT booking.id, booking.first_name, booking.last_name, booking.country,
         room_type.name AS room_type, booking.nights, booking.season, booking.total_price,
         booking.is_historical, booking.arrival_date
    FROM booking
    JOIN room_type ON room_type.id = booking.room_type_id`;

// MySQL gemmer BOOLEAN som 0/1. API'et skal svare med true/false.
function toBooking(row) {
  return { ...row, is_historical: row.is_historical === 1 };
}

// Uden search: alle bookinger, nyeste først. Med search: matcher for-, efter- og fulde navn.
// Kollationen utf8mb4_0900_ai_ci gør, at "muller" også finder "Müller" (research R9).
async function findAll(search) {
  if (!search) {
    const [rows] = await pool.query(`${SELECT_BOOKING} ORDER BY booking.id DESC`);
    return rows.map(toBooking);
  }
  const pattern = `%${search}%`;
  const [rows] = await pool.query(
    `${SELECT_BOOKING}
      WHERE booking.first_name LIKE ?
         OR booking.last_name LIKE ?
         OR CONCAT(booking.first_name, ' ', booking.last_name) LIKE ?
      ORDER BY booking.id DESC`,
    [pattern, pattern, pattern],
  );
  return rows.map(toBooking);
}

async function findById(id) {
  const [rows] = await pool.query(`${SELECT_BOOKING} WHERE booking.id = ?`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

// Nye bookinger er aldrig historiske. Returnerer det nye id.
async function create(booking) {
  const [result] = await pool.query(
    `INSERT INTO booking
       (first_name, last_name, country, room_type_id, nights, season, total_price,
        arrival_date, is_historical)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)`,
    [
      booking.first_name, booking.last_name, booking.country, booking.room_type_id,
      booking.nights, booking.season, booking.total_price, booking.arrival_date,
    ],
  );
  return result.insertId;
}

async function update(id, booking) {
  await pool.query(
    `UPDATE booking
        SET first_name = ?, last_name = ?, country = ?, room_type_id = ?, nights = ?,
            season = ?, total_price = ?, arrival_date = ?
      WHERE id = ?`,
    [
      booking.first_name, booking.last_name, booking.country, booking.room_type_id,
      booking.nights, booking.season, booking.total_price, booking.arrival_date, id,
    ],
  );
}

async function remove(id) {
  await pool.query('DELETE FROM booking WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, update, remove };
