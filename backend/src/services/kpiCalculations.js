// Forretningslag: rene funktioner til nøgletal (data ind, resultat ud – ingen SQL, ingen HTTP).
// Al summering og gruppering sker her og ikke i SQL, så tallene kan unit-testes (princip V, XII).

// Hotellet har 214 værelser i alt uden fast fordeling pr. værelsestype (princip VII).
const CAPACITY = 214;

// De tre sæsoner i fast rækkefølge (FR-007). Bruges, så alle kombinationer kommer med.
const SEASONS = ['low', 'mid', 'high'];

const DAY_MS = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' + n dage → 'YYYY-MM-DD'. Regnes i UTC, så sommertid ikke flytter datoen (research R8).
function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS).toISOString().slice(0, 10);
}

// FR-016
function totalRevenue(rows) {
  return {
    total_revenue: rows.reduce((sum, row) => sum + Number(row.total_price), 0),
    booking_count: rows.length,
  };
}

// FR-017: omsætning pr. værdi af `key` (country, room_type eller season), størst først.
// Ved ens omsætning sorteres efter navn, så rækkefølgen er den samme ved hvert kald.
function revenueBy(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row[key]) || { key: row[key], revenue: 0, booking_count: 0 };
    group.revenue += Number(row.total_price);
    group.booking_count += 1;
    groups.set(row[key], group);
  }
  return [...groups.values()].sort((a, b) => b.revenue - a.revenue || a.key.localeCompare(b.key));
}

// FR-017: omsætning pr. værelsestype pr. sæson. Én række for hver kombination (8 × 3 = 24),
// også med 0, så en værelsestype ikke forsvinder, når der filtreres på en sæson (research R7).
// Rækkefølgen følger roomTypeNames og derefter SEASONS.
function revenueByRoomTypeSeason(rows, roomTypeNames) {
  const result = [];
  const index = new Map();
  for (const roomType of roomTypeNames) {
    for (const season of SEASONS) {
      const row = { room_type: roomType, season, revenue: 0, booking_count: 0 };
      index.set(`${roomType}|${season}`, row);
      result.push(row);
    }
  }
  for (const row of rows) {
    const group = index.get(`${row.room_type}|${row.season}`);
    group.revenue += Number(row.total_price);
    group.booking_count += 1;
  }
  return result;
}

function toOccupancy(date, bookedRooms) {
  return {
    date,
    booked_rooms: bookedRooms,
    capacity: CAPACITY,
    occupancy_percent: Math.round((bookedRooms / CAPACITY) * 1000) / 10,
  };
}

// Antal bookede værelser pr. nat. En booking med ankomst 6/12 og 3 nætter optager nætterne
// 6., 7. og 8./12. – afrejsedagen 9./12. tæller ikke.
function roomsPerNight(stays) {
  const counts = new Map();
  for (const stay of stays) {
    for (let i = 0; i < Number(stay.nights); i += 1) {
      const night = addDays(stay.arrival_date, i);
      counts.set(night, (counts.get(night) || 0) + 1);
    }
  }
  return counts;
}

// FR-018: belægning for én nat. `stays` er kun bookinger med ankomstdato (ikke historiske).
function occupancyForDate(stays, date) {
  return toOccupancy(date, roomsPerNight(stays).get(date) || 0);
}

// FR-018, FR-021: én række for hver nat fra den tidligste til den seneste dækkede nat,
// også nætter uden bookinger imellem, så Tableau får en sammenhængende tidsakse.
function occupancyPerNight(stays) {
  const counts = roomsPerNight(stays);
  if (counts.size === 0) {
    return [];
  }
  const nights = [...counts.keys()].sort();
  const last = nights[nights.length - 1];
  const result = [];
  for (let night = nights[0]; night <= last; night = addDays(night, 1)) {
    result.push(toOccupancy(night, counts.get(night) || 0));
  }
  return result;
}

// FR-019: mest solgte drink pr. kategori i enheder. Ved uafgjort kommer alle med.
// `rows` kommer fra barCalculations.withUnitsSold, så både historiske og nye salg tæller.
function topDrinks(rows) {
  const best = new Map();
  for (const row of rows) {
    const current = best.get(row.category);
    if (current === undefined || row.units_sold > current) {
      best.set(row.category, row.units_sold);
    }
  }
  return rows
    .filter((row) => row.units_sold === best.get(row.category))
    .map((row) => ({
      category: row.category,
      drink_id: row.id,
      name: row.name,
      units_sold: row.units_sold,
    }))
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}

module.exports = {
  CAPACITY,
  SEASONS,
  totalRevenue,
  revenueBy,
  revenueByRoomTypeSeason,
  occupancyForDate,
  occupancyPerNight,
  topDrinks,
};
