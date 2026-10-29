// Engangsscript: laver db-init/02-seed.sql ud fra kildefilerne i scripts/source/.
// Kør fra repo-roden:  node scripts/generate-seed.js
// Den genererede SQL committes. Scriptet køres ikke ved opstart (research R3).
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.join(__dirname, 'source');
const OUTPUT_FILE = path.join(__dirname, '..', 'db-init', '02-seed.sql');

const BOOKINGS_FILE = 'international_names_with_rooms_1000.csv';
const DRINKS_FILE = 'drinks_menu_with_sales.csv';

// Priser pr. nat fra FR-008 (lav = laveste, mellem = midterpris, høj = højeste)
const ROOM_TYPES = [
  { name: 'Standard Single', low: 900, mid: 1050, high: 1200 },
  { name: 'Grand Lit', low: 1100, mid: 1250, high: 1400 },
  { name: 'Standard Double', low: 1200, mid: 1400, high: 1600 },
  { name: 'Superior Double', low: 1400, mid: 1700, high: 2000 },
  { name: 'Junior Suite', low: 1800, mid: 2150, high: 2500 },
  { name: 'Spa Executive', low: 2000, mid: 2400, high: 2800 },
  { name: 'Suite', low: 2500, mid: 3000, high: 3500 },
  { name: 'LOFT Suite', low: 3000, mid: 3500, high: 4000 },
];

// Kildefilen har et tabt "ü" (U+FFFD). Repoets egen xlsx-udgave har "Müller" (research R2).
const BROKEN_MULLER = 'M�ller';
const FIXED_MULLER = 'Müller';

function fail(message) {
  console.error(`Fejl: ${message}`);
  process.exit(1);
}

// Læser en simpel CSV (komma, ingen anførselstegn). Tåler både \n og \r\n samt en evt. BOM.
function readCsv(fileName, expectedHeader) {
  const text = fs.readFileSync(path.join(SOURCE_DIR, fileName), 'utf8').replace(/^﻿/, '');
  const lines = text
    .split('\n')
    .map((line) => line.replace(/\r$/, ''))
    .filter((line) => line.trim() !== '');
  const header = lines.shift();
  if (header !== expectedHeader) {
    fail(`${fileName}: uventet header "${header}"`);
  }
  return lines.map((line, i) => {
    if (line.includes('"')) {
      fail(`${fileName} linje ${i + 2}: anførselstegn understøttes ikke`);
    }
    return line.split(',');
  });
}

// SQL-streng med escaping af \ og '
function sqlString(value) {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function isWholeNumber(value) {
  return /^\d+$/.test(value);
}

// --- Bookinger ---
const roomTypeNames = new Set(ROOM_TYPES.map((r) => r.name));
let fixedNames = 0;

const bookingRows = readCsv(
  BOOKINGS_FILE,
  'First Name,Family Name,Country,Room Type,Days Rented,Season,Price',
).map((cols, i) => {
  const lineNo = i + 2;
  if (cols.length !== 7) fail(`${BOOKINGS_FILE} linje ${lineNo}: forventede 7 kolonner`);
  let [firstName, lastName, country, roomType, nights, season, price] = cols;

  if (lastName === BROKEN_MULLER) {
    lastName = FIXED_MULLER;
    fixedNames++;
  }
  if ([firstName, lastName, country].some((v) => v.includes('�'))) {
    fail(`${BOOKINGS_FILE} linje ${lineNo}: ukendt tegnfejl i "${cols.join(',')}"`);
  }
  if (!roomTypeNames.has(roomType)) fail(`${BOOKINGS_FILE} linje ${lineNo}: ukendt værelsestype "${roomType}"`);
  if (!['low', 'mid', 'high'].includes(season)) fail(`${BOOKINGS_FILE} linje ${lineNo}: ukendt sæson "${season}"`);
  if (!isWholeNumber(nights) || Number(nights) < 1) fail(`${BOOKINGS_FILE} linje ${lineNo}: ugyldigt antal nætter "${nights}"`);
  if (!isWholeNumber(price)) fail(`${BOOKINGS_FILE} linje ${lineNo}: ugyldig pris "${price}"`);

  return `(${sqlString(firstName)}, ${sqlString(lastName)}, ${sqlString(country)}, `
    + `(SELECT id FROM room_type WHERE name = ${sqlString(roomType)}), `
    + `${nights}, '${season}', ${price}, TRUE, NULL)`;
});

if (bookingRows.length !== 1000) fail(`forventede 1000 bookinger, fandt ${bookingRows.length}`);

// --- Drikkevarer ---
const drinkRows = readCsv(DRINKS_FILE, 'Drink Name,Category,Price (DKK),Units Sold').map((cols, i) => {
  const lineNo = i + 2;
  if (cols.length !== 4) fail(`${DRINKS_FILE} linje ${lineNo}: forventede 4 kolonner`);
  const [name, category, price, unitsSold] = cols;

  if (!['Coffee', 'Cocktail'].includes(category)) fail(`${DRINKS_FILE} linje ${lineNo}: ukendt kategori "${category}"`);
  if (!/^\d+\.\d{2}$/.test(price)) fail(`${DRINKS_FILE} linje ${lineNo}: pris skal have 2 decimaler, fandt "${price}"`);
  if (!isWholeNumber(unitsSold)) fail(`${DRINKS_FILE} linje ${lineNo}: ugyldigt antal solgt "${unitsSold}"`);

  return `(${sqlString(name)}, '${category}', ${price}, ${unitsSold})`;
});

if (drinkRows.length !== 30) fail(`forventede 30 drikkevarer, fandt ${drinkRows.length}`);

// --- Skriv SQL ---
const roomTypeRows = ROOM_TYPES.map((r) => `(${sqlString(r.name)}, ${r.low}, ${r.mid}, ${r.high})`);

const sql = `-- GENERERET af scripts/generate-seed.js. Ret ikke i hånden; kør scriptet igen.
-- Kilde: https://github.com/ITAKEA/hoteldata
--   ${BOOKINGS_FILE} (1000 bookinger) og drinks_menu_with_sales.xlsx (30 drikkevarer,
--   gemt som scripts/source/${DRINKS_FILE}).
-- Rettelse: efternavnet "M\\uFFFDller" (tabt tegn) er skrevet som "Müller" i ${fixedNames} rækker,
--   som i kildens egen xlsx-udgave (research R2). Ingen andre værdier er ændret.
-- Historiske bookinger har ingen ankomstdato (FR-002, FR-003).

SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO room_type (name, price_low, price_mid, price_high) VALUES
${roomTypeRows.join(',\n')};

INSERT INTO booking (first_name, last_name, country, room_type_id, nights, season, total_price, is_historical, arrival_date) VALUES
${bookingRows.join(',\n')};

INSERT INTO drink (name, category, price, historical_units_sold) VALUES
${drinkRows.join(',\n')};

COMMIT;
`;

fs.writeFileSync(OUTPUT_FILE, sql);
console.log(`Skrev ${path.relative(process.cwd(), OUTPUT_FILE)}: `
  + `${roomTypeRows.length} værelsestyper, ${bookingRows.length} bookinger, ${drinkRows.length} drikkevarer `
  + `(${fixedNames} × "${FIXED_MULLER}" rettet)`);
