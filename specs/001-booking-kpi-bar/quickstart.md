# Quickstart: validering af 001-booking-kpi-bar

**Plan**: [plan.md](plan.md) | **Kontrakt**: [contracts/openapi.yaml](contracts/openapi.yaml) |
**Datamodel**: [data-model.md](data-model.md)

Guiden viser, at featuren virker end-to-end. Forventede tal er udregnet direkte fra
kildefilerne (se [research.md](research.md) R1).

## Forudsætninger

- Docker Desktop med Compose v2.20+ (kræves for `include`)
- `curl` (Git Bash på Windows)
- Tableau Desktop 2023.3+ med **REST API Connector** fra Tableau Exchange (kun for trin 7)

## 1. Start systemet

```bash
cp .env.example .env          # udfyld passwords (brug IKKE de gamle fra Git-historikken)
docker compose down -v        # nulstiller pg_data (startdata indlæses igen). Gammel MySQL-volumen: docker volume rm hotel-kong-artur_mysql_data
docker compose up --build
```

Forventet:
- Kun `db` og `backend` starter (ikke `app`).
- `backend` starter først, når `db` er *healthy*.
- `curl -s localhost:3000/api/health` → `{"status":"ok"}`.
- Swagger UI åbner på http://localhost:3000/api-docs.

Dev-containeren startes separat: `docker compose --profile dev up -d app`.

## 2. Startdata (FR-001–FR-003, SC-006)

SQL'en sendes ind via stdin (heredoc) og ikke som `-e "..."`-argument. I Git Bash på Windows
bliver "ü" i kommandolinje-argumenter ødelagt, så `Müller`-tjekket fejlagtigt giver 0.
`-T` er nødvendig, når der sendes data ind via stdin.

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
SELECT COUNT(*), COUNT(*) FILTER (WHERE is_historical), COUNT(*) FILTER (WHERE arrival_date IS NULL) FROM booking;
SELECT category, COUNT(*) FROM drink GROUP BY category;
SELECT COUNT(*) FROM booking WHERE last_name = 'Müller';
SELECT SUM(total_price) FROM booking;
SELECT ROUND(SUM(price * historical_units_sold), 2) FROM drink;
SELECT COUNT(*) FROM room_type;
SQL
```

| Tjek | Forventet |
|------|-----------|
| bookinger / historiske / uden dato | 1000 / 1000 / 1000 |
| drinks | Cocktail 20, Coffee 10 |
| `Müller` | 54 (ingen `�`) |
| `SUM(total_price)` | 11234034 |
| barens historiske omsætning | 13448640.34 |
| værelsestyper | 8 |

**Persistens** (princip IX): `docker compose down` (uden `-v`) og derefter `docker compose up -d`.
`db` skal blive *healthy* igen, og det første SELECT skal stadig give 1000.

## 3. Unit-tests (princip XII)

```bash
docker compose run --rm --no-deps backend npm test     # eller: cd backend && npm test
```

Forventet: alle tests grønne. De dækker sæson for 12 måneder, pris for 8 × 3, ugyldige datoer,
belægning, uafgjort top-drink og procentsum = 100. Ingen database er nødvendig.

## 4. Bookinger (US1)

```bash
API=localhost:3000/api
# Opret: december = højsæson, Standard Single 1.200 × 3 = 3.600
curl -si -X POST $API/bookings -H 'Content-Type: application/json' \
  -d '{"first_name":"Test","last_name":"Gæst","country":"Denmark","room_type":"Standard Single","arrival_date":"2026-12-06","nights":3}'
```

| Scenarie | Forventet |
|----------|-----------|
| Opret (ovenfor) | `201`, `Location`-header, `season: "high"`, `total_price: 3600`, `is_historical: false` |
| `GET $API/bookings?search=muller` | Indeholder historiske "Müller"-bookinger (accent-ufølsom) |
| `GET $API/bookings?search=Gæst` | Den nye booking |
| `PUT` samme id med `arrival_date: "2026-11-30"` | `200`, `season: "low"`, `total_price: 2700` (edge case: månedsskifte) |
| `POST` med `arrival_date: "2026-02-31"` og `nights: 0` | `400`, `fields` indeholder `arrival_date` og `nights` |
| `POST` med `{}` | `400`, `fields` nævner alle 6 felter |
| `POST` med `room_type: "Penthouse"` | `400`, `fields: ["room_type"]` |
| `PUT`/`DELETE` på booking `1` (historisk) | `409` |
| `GET $API/bookings/999999` | `404` |
| `DELETE` den nye booking | `204`, og derefter `GET` → `404` |

## 5. Nøgletal (US2)

Kør på frisk startdata, dvs. før/efter oprettelse og sletning i trin 4:

| Kald | Forventet |
|------|-----------|
| `GET $API/kpi/revenue/total` | `total_revenue: 11234034`, `booking_count: 1000` |
| `GET $API/kpi/revenue/by-country` / `by-room-type` / `by-season` | 20 / 8 / 3 rækker. Σ `revenue` = 11234034 i hver |
| `GET $API/kpi/revenue/by-room-type-season` | 24 rækker (8 × 3, også med `revenue: 0`). Σ `revenue` = 11234034 |
| `GET $API/kpi/occupancy?date=2026-12-07` | `booked_rooms: 0`, `occupancy_percent: 0` (historiske tæller ikke) |
| `GET $API/kpi/occupancy?date=2026-13-01` | `400` |
| `GET $API/kpi/occupancy/nights` | `[]` (ingen bookinger med ankomstdato endnu) |
| `GET $API/kpi/top-drinks` | `[{category: "Coffee", name: "Espresso", units_sold: 14656, ...}, {category: "Cocktail", name: "Whiskey Sour", units_sold: 3824, ...}]` (fladt array) |

**Live (US2-5, SC-004)**: Opret bookingen fra trin 4 igen og kald endpoints igen.
`total_revenue` stiger med 3600, `Denmark` dukker op i `by-country`, og `occupancy?date=2026-12-07`
giver `booked_rooms: 1`, `occupancy_percent: 0.5`. For `2026-12-09` (afrejsedagen) er værdien 0.
`occupancy/nights` giver nu 3 rækker (`2026-12-06`, `-07`, `-08`), hver med `booked_rooms: 1`.

## 6. Barsalg (US3)

| Kald | Forventet |
|------|-----------|
| `GET $API/bar/drinks` | 30 drinks |
| `GET $API/bar/kpi/total` | `units_sold: 179958`, `revenue: 13448640.34` |
| `GET $API/bar/kpi/category-split` | Cocktail `52.83`, Coffee `47.17` (sum 100) |
| `POST $API/bar/sales` `{"drink_id":<Espresso>,"quantity":2}` | `201` med `sold_at` sat automatisk i dansk tid (research R11) |
| Derefter `bar/kpi/total` | `units_sold: 179960`, `revenue` + 138.20 |
| Derefter `bar/kpi/revenue-by-drink` | Espresso `units_sold: 14658` |
| `POST $API/bar/sales` med `quantity: 0` eller `-1` | `400`, `fields: ["quantity"]` |
| `POST $API/bar/sales` med ukendt `drink_id` | `400`, `fields: ["drink_id"]` |
| `GET $API/bar/sales` | Det registrerede salg øverst med `name: "Espresso"`, `quantity: 2` og `sold_at` (FR-034) |
| `DELETE $API/bar/sales/<id fra salget>` | `204`. Derefter `bar/kpi/total` → `units_sold: 179958` igen, og `GET $API/bar/sales` → `[]` |
| `DELETE` samme id igen / `DELETE $API/bar/sales/abc` | `404` / `400` med `fields: ["id"]` |

## 7. Tableau Desktop (FR-021, FR-027, SC-007)

1. I Tableau Desktop: *Connect → REST API Connector* (installeret fra Tableau Exchange). Opret
   én datakilde pr. endpoint med metoden GET og URL `http://localhost:3000/api/...`:

   | Endpoint | JSONPath | Forventet på frisk startdata |
   |----------|----------|------------------------------|
   | `kpi/revenue/total` | `$` | 1 række: `total_revenue` 11234034, `booking_count` 1000 |
   | `kpi/revenue/by-country` / `by-room-type` / `by-season` | `$[*]` | 20 / 8 / 3 rækker |
   | `kpi/revenue/by-room-type-season` | `$[*]` | 24 rækker. Læg `season` på *Filters* |
   | `kpi/occupancy/nights` | `$[*]` | 0 rækker (ingen bookinger med ankomstdato endnu) |
   | `kpi/top-drinks` | `$[*]` | 2 rækker: Espresso 14656, Whiskey Sour 3824 |
   | `bar/kpi/total` | `$` | 1 række: `units_sold` 179958, `revenue` 13448640.34 |
   | `bar/kpi/revenue-by-drink` | `$[*]` | 30 rækker |
   | `bar/kpi/category-split` | `$[*]` | 2 rækker: Cocktail 52.83, Coffee 47.17 |

   Vis værdierne direkte (én række = ét mærke). Tableau skal ikke selv beregne nøgletal
   (research R7).
2. Sammenlign hvert tal i Tableau med det samme endpoint i Swagger UI eller med `curl` (SC-007).
3. **Tilføj data → Refresh → nye tal vises** ("live", princip V):
   - Opret bookingen fra trin 4 og registrér 2 × Espresso (trin 6).
   - Vælg *Data → Refresh* for hver datakilde i Tableau.
   - Forventet: `total_revenue` stiger med 3600, `Denmark` dukker op i `by-country`,
     `occupancy/nights` får 3 rækker med `booked_rooms: 1`, og Espresso får `units_sold` 14658 i
     `revenue-by-drink` og `top-drinks`.

## 8. Konstitutionstjek efter implementering

- `grep -rn "SELECT\|INSERT\|UPDATE\|DELETE FROM" backend/src --include=*.js` finder kun
  træffere i `backend/src/repositories/`.
- `git ls-files | grep -E '^\.env$'` giver intet. `.env.example` er committet.
- Genstart (`docker compose restart`): den oprettede booking findes stadig (named volume).

## 9. Frontend i browseren (FR-014, FR-029, FR-031, FR-032, SC-001, SC-003, SC-008, SC-010)

Åbn http://localhost:3000/ efter trin 1 med startdata (intet oprettet endnu).

| Side | Handling | Forventet |
|------|----------|-----------|
| `/` | Åbn forsiden | Hotellets header ("Hotel" / "KONG ARTHUR"), navigation til Bookinger, Overblik og Bar. Farver og skrifter som research R12 |
| `bookings.html` | Opret Test Gæst, Standard Single, 2026-12-06, 3 nætter (tag tid) | Under 2 minutter (SC-001). Succesbesked, og rækken viser `high` og 3.600 kr. fra API'et |
| `bookings.html` | Søg "muller" | 54 rækker. Historiske har ingen ret- og slet-knapper |
| `bookings.html` | Gem med dato `2026-02-31` og 0 nætter | Strimlen under "Ankomstdato" og "Nætter" (som "Nødvendig information" på hotellets side). Intet gemt |
| `bookings.html` | Ret bookingen til 2026-11-30, derefter slet (bekræft) | `low` og 2.700 kr. Derefter væk fra listen |
| `overview.html` | Åbn | Samlet indtjening 11.234.034 kr. (1000 bookinger), fordelinger på land (20), værelsestype (8) og sæson (3), 24 rækker pr. værelsestype pr. sæson, mest solgte Espresso 14.656 og Whiskey Sour 3.824 |
| `overview.html` | Vælg sæson "high" | 8 rækker, kun `high` (filtrering af de hentede rækker, ingen beregning) |
| `overview.html` | Opret en booking igen, opdatér siden, vælg 2026-12-06 | Belægning 0,5 %, og tabellen over belægning pr. nat har rækker (SC-004) |
| `bar.html` | Vælg Espresso, antal 2, "Registrér" (tag tid) | Under 15 sekunder (SC-003). Besked "2 × Espresso registreret", total +2 enheder og +138,20 kr. |
| `bar.html` | Antal 0 | Fejlbesked, intet registreres |
| Alle | Udviklerværktøj, 375 px og 768 px bredde | Ingen vandret scroll, tabeller scroller i deres egen boks (SC-010) |
| Alle | Tab gennem siden | Synligt fokus på alle links, knapper og felter (FR-032) |

**SC-008**: Tallene på `overview.html` og `bar.html` skal være de samme som i Swagger UI
(trin 5–6) og Tableau (trin 7). Tabellen over alle 11 endpoints laves i T070.

Slet testbookingen bagefter (eller kør `docker compose down -v`), så startdata-tallene passer igen.
Barsalget kan kun fjernes med `docker compose down -v`.
