// Fælles forbindelsespulje til PostgreSQL. Bruges kun af repositories (datalaget).
const { Pool, types } = require('pg');

// DATE og TIMESTAMP returneres som tekst ('2026-12-06', '2026-11-02 14:03:12') og ikke som
// JS-Date, så tidszoner ikke flytter datoer (research R8 og R11). 1082 = DATE, 1114 = TIMESTAMP.
types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => value);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  max: 10,
  // Forbindelsens tidszone styrer LOCALTIMESTAMP, så sold_at bliver dansk tid (research R11)
  options: '-c timezone=Europe/Copenhagen',
});

module.exports = pool;
