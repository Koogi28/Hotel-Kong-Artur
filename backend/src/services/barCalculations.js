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

// Hele øre → kroner med 2 decimaler (13844 → 138.44). Kun til svaret, aldrig før summering.
function toKroner(ore) {
  return ore / 100;
}

// Kategorierne i fast rækkefølge, så category-split altid har 2 rækker (kontrakten).
const CATEGORIES = ['Cocktail', 'Coffee'];

// Øvre grænse for antal i ét salg (research R9).
const MAX_QUANTITY = 1000;

// FR-025: omsætning pr. drink for alle drinks, også dem uden salg.
// `rows` kommer fra withUnitsSold. Omsætning regnes i øre og returneres i kroner.
function revenueByDrink(rows) {
  return rows.map((row) => ({
    drink_id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    historical_units: Number(row.historical_units_sold),
    registered_units: row.registered_units,
    units_sold: row.units_sold,
    revenue: toKroner(toOre(row.price) * row.units_sold),
  }));
}

// FR-024: samlede enheder og omsætning. Summeres i øre (research R8).
function barTotal(rows) {
  let unitsSold = 0;
  let revenueOre = 0;
  for (const row of rows) {
    unitsSold += row.units_sold;
    revenueOre += toOre(row.price) * row.units_sold;
  }
  return { units_sold: unitsSold, revenue: toKroner(revenueOre) };
}

// FR-026: fordeling af omsætningen mellem cocktails og kaffe.
// Procent regnes i hundrededele (heltal): Cocktail afrundes, og Coffee = 100 − Cocktail,
// så summen altid er præcis 100. Uden omsætning er begge 0.
function categorySplit(rows) {
  const totals = new Map(CATEGORIES.map((category) => [category, { units: 0, ore: 0 }]));
  for (const row of rows) {
    const total = totals.get(row.category);
    total.units += row.units_sold;
    total.ore += toOre(row.price) * row.units_sold;
  }
  const allOre = totals.get('Cocktail').ore + totals.get('Coffee').ore;
  const cocktailHundredths = allOre === 0
    ? 0
    : Math.round((totals.get('Cocktail').ore * 10000) / allOre);
  const coffeeHundredths = allOre === 0 ? 0 : 10000 - cocktailHundredths;
  const percent = { Cocktail: cocktailHundredths / 100, Coffee: coffeeHundredths / 100 };

  return CATEGORIES.map((category) => ({
    category,
    units_sold: totals.get(category).units,
    revenue: toKroner(totals.get(category).ore),
    percent: percent[category],
  }));
}

// Returnerer listen af ugyldige felter. Alle fejl samles, så brugeren ser dem på én gang,
// ligesom validateBookingInput. Om drinken findes i databasen, tjekkes i barService.
function validateSaleInput(body) {
  const input = body || {};
  const fields = [];
  if (!Number.isInteger(input.drink_id) || input.drink_id < 1) {
    fields.push('drink_id');
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_QUANTITY) {
    fields.push('quantity');
  }
  return fields;
}

module.exports = {
  withUnitsSold,
  toOre,
  revenueByDrink,
  barTotal,
  categorySplit,
  validateSaleInput,
};
