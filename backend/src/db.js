// Fælles forbindelsespulje til MySQL. Bruges kun af repositories (datalaget).
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  charset: 'utf8mb4',
  // DATE/DATETIME returneres som tekst ('2026-12-06'), så tidszoner ikke flytter datoer (research R8)
  dateStrings: true,
  connectionLimit: 10,
});

module.exports = pool;
