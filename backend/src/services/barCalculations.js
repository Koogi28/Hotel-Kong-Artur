// Forretningslag: rene funktioner til barens tal (data ind, resultat ud – ingen SQL, ingen HTTP).

// Lægger historiske og registrerede enheder sammen pr. drink (research R9).
// registered_units kommer fra SUM() i MySQL og kan derfor være en streng.
function withUnitsSold(rows) {
  return rows.map((row) => {
    const registered = Number(row.registered_units);
    return {
      ...row,
      registered_units: registered,
      units_sold: Number(row.historical_units_sold) + registered,
    };
  });
}

// Kroner (DECIMAL-streng som "91.40" eller tal) → hele øre, så summer ikke får
// flydende-tal-fejl (research R8).
function toOre(price) {
  return Math.round(Number(price) * 100);
}

module.exports = { withUnitsSold, toOre };
