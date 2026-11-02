// Datalag: bookinger. Al SQL for bookinger står her, altid med $1, $2, ...-pladsholdere,
// så brugerinput aldrig sættes direkte ind i SQL (beskytter mod SQL-injection).
const pool = require('../db');

// Felterne svarer til kontraktens Booking. room_type returneres som navn via JOIN.
const SELECT_BOOKING = `
  SELECT booking.id, booking.first_name, booking.last_name, booking.country,
         room_type.name AS room_type, booking.nights, booking.season, booking.total_price,
         booking.is_historical, booking.arrival_date
    FROM booking
    JOIN room_type ON room_type.id = booking.room_type_id`;

// PostgreSQL giver BOOLEAN som true/false. Sammenligningen med true sikrer, at API'et altid
// svarer med en rigtig boolean, og at historiske bookinger bliver låst (FR-003, research R11).
function toBooking(row) {
  return { ...row, is_historical: row.is_historical === true };
}

// Uden search: alle bookinger, nyeste først. Med search: matcher for-, efter- og fulde navn.
// unaccent + ILIKE gør søgningen accent- og versalufølsom, så "muller" også finder "Müller"
// (research R9 og R11).
async function findAll(search) {
  if (!search) {
    const { rows } = await pool.query(`${SELECT_BOOKING} ORDER BY booking.id DESC`);
    return rows.map(toBooking);
  }
  const pattern = `%${search}%`;
  const { rows } = await pool.query(
    `${SELECT_BOOKING}
      WHERE unaccent(booking.first_name) ILIKE unaccent($1)
         OR unaccent(booking.last_name) ILIKE unaccent($1)
         OR unaccent(booking.first_name || ' ' || booking.last_name) ILIKE unaccent($1)
      ORDER BY booking.id DESC`,
    [pattern],
  );
  return rows.map(toBooking);
}

async function findById(id) {
  const { rows } = await pool.query(`${SELECT_BOOKING} WHERE booking.id = $1`, [id]);
  return rows[0] ? toBooking(rows[0]) : null;
}

// Nye bookinger er aldrig historiske. Returnerer det nye id.
async function create(booking) {
  const { rows } = await pool.query(
    `INSERT INTO booking
       (first_name, last_name, country, room_type_id, nights, season, total_price,
        arrival_date, is_historical)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)
     RETURNING id`,
    [
      booking.first_name, booking.last_name, booking.country, booking.room_type_id,
      booking.nights, booking.season, booking.total_price, booking.arrival_date,
    ],
  );
  return rows[0].id;
}

async function update(id, booking) {
  await pool.query(
    `UPDATE booking
        SET first_name = $1, last_name = $2, country = $3, room_type_id = $4, nights = $5,
            season = $6, total_price = $7, arrival_date = $8
      WHERE id = $9`,
    [
      booking.first_name, booking.last_name, booking.country, booking.room_type_id,
      booking.nights, booking.season, booking.total_price, booking.arrival_date, id,
    ],
  );
}

async function remove(id) {
  await pool.query('DELETE FROM booking WHERE id = $1', [id]);
}

// Råe rækker til omsætningsnøgletal. Ingen SUM/GROUP BY her – det sker i services (princip V).
async function findRevenueRows() {
  const { rows } = await pool.query(
    `SELECT booking.country, room_type.name AS room_type, booking.season, booking.total_price
       FROM booking
       JOIN room_type ON room_type.id = booking.room_type_id`,
  );
  return rows;
}

// Ophold til belægning. Historiske bookinger har ingen ankomstdato og tæller derfor ikke.
async function findDatedStays() {
  const { rows } = await pool.query(
    'SELECT arrival_date, nights FROM booking WHERE arrival_date IS NOT NULL',
  );
  return rows;
}

module.exports = {
  findAll, findById, create, update, remove, findRevenueRows, findDatedStays,
};
