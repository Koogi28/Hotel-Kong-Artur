---

description: "Tasks for 001-booking-kpi-bar"
---

# Tasks: Bookinger, nøgletal og barsalg

**Input**: Design documents from `/specs/001-booking-kpi-bar/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/openapi.yaml](contracts/openapi.yaml),
[quickstart.md](quickstart.md)

**Tests**: Konstitutionens princip XII kræver simple automatiske tests af sæson, pris og
nøgletal. Unit-tests (`node:test`, uden database) er derfor med for de rene funktioner i
`backend/src/services/`. Skriv testen først, og se den fejle.

**Organization**: Setup (Docker-skelet + seed, kan laves i dag) → Foundational → US1 → US2 →
US3 → Polish. Frontend-tasks (`backend/public/`) er markeret **(uge 2)**.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan laves parallelt (andre filer, ingen afhængighed af ufærdige tasks)
- **[Story]**: US1, US2 eller US3
- Stier er relative til repo-roden

## Lagregler (gælder alle tasks, princip II)

- `controllers/`: kun HTTP ind/ud (læs params/body, kald service, sæt status, send JSON/CSV).
  Ingen SQL, ingen beregninger.
- `services/`: validering, sæson, pris, nøgletal. Rene funktioner ligger i `*Rules.js`,
  `*Calculations.js` og `csv.js`. `*Service.js` henter rækker fra repositories og kalder dem.
- `repositories/`: al SQL (`mysql2/promise`, parametriserede `?`-forespørgsler, ingen ORM).
- Fejl kastes som `ValidationError(fields)` → 400, `NotFoundError` → 404 eller
  `ConflictError` → 409 fra `services/errors.js`. Én fejl-middleware oversætter dem.

---

## Phase 1: Setup (Docker-skelet og seed – i dag)

**Purpose**: `docker compose up` starter `db` (seedet) og `backend` med `/api/health` og
Swagger UI. Ingen forretningslogik endnu.

### Backend-skelet

- [X] T001 Opret `backend/package.json` (`"name": "hotel-kong-artur-backend"`, `"private": true`, `"engines": {"node": ">=20"}`, scripts `"start": "node src/server.js"` og `"test": "node --test tests/unit"`) med præcis afhængighederne `express`, `mysql2`, `swagger-ui-express` og `yaml` (ingen devDependencies). Kør `npm install` i `backend/`, så `backend/package-lock.json` oprettes. Tilføj `node_modules/` til `.gitignore` og `.dockerignore`
- [X] T002 [P] Opret `.env.example` i repo-roden med `MYSQL_ROOT_PASSWORD=change-me-root`, `MYSQL_DATABASE=project_db`, `MYSQL_USER=team_user`, `MYSQL_PASSWORD=change-me` og `PORT=3000` plus en kommentar om at kopiere filen til `.env` og ikke genbruge de gamle passwords fra Git-historikken (research R6). `.env` må ikke committes (står allerede i `.gitignore`)
- [X] T003 Opret `backend/src/db.js`: en `mysql2/promise`-pool fra `MYSQL_HOST`, `MYSQL_PORT` (default 3306), `MYSQL_USER`, `MYSQL_PASSWORD` og `MYSQL_DATABASE` med `dateStrings: true`, `charset: 'utf8mb4'` og `connectionLimit: 10`. Eksportér poolen (research R8)
- [X] T004 Opret `backend/src/app.js` og `backend/src/server.js`. `app.js` laver Express-appen med `express.json()`, `express.static('public')` (sti relativt til `backend/`) og `app.use(routes)` fra `backend/src/routes.js` (tom router indtil videre). Til sidst kommer en JSON-404 for ukendte `/api`-stier (`{"error": "Endpoint findes ikke"}`), JSON-400 ved ugyldig JSON-body og en fejl-middleware, der svarer `500 {"error": "Intern fejl"}` og logger fejlen. `server.js` starter appen på `PORT` (default 3000). Opret også `backend/public/index.html` som en simpel pladsholder ("Hotel Kong Arthur – frontend kommer i uge 2")
- [X] T005 Swagger UI: I `backend/src/app.js` indlæses OpenAPI-filen med `yaml.parse(fs.readFileSync(process.env.OPENAPI_PATH || '../specs/001-booking-kpi-bar/contracts/openapi.yaml'))` (sti relativt til `backend/`), og `swagger-ui-express` monteres på `/api-docs`. Kontrakten må ikke kopieres ind i `backend/` (plan: én kilde)
- [X] T006 `/api/health` gennem alle tre lag: `backend/src/repositories/healthRepository.js` (`ping()` kører `SELECT 1`), `backend/src/services/healthService.js` (`check()` returnerer `{status: 'ok'}` eller `{status: 'error'}`), `backend/src/controllers/healthController.js` (200 ved ok, 503 ved error, jf. kontraktens `Health`) og route `GET /api/health` i `backend/src/routes.js`
- [X] T007 Opret `backend/Dockerfile` til build-context = repo-roden: `FROM node:20-alpine`, `WORKDIR /app`, kopiér `backend/package*.json` og kør `npm ci --omit=dev`. Kopiér derefter `backend/` til `/app` og `specs/001-booking-kpi-bar/contracts/openapi.yaml` til `/app/openapi.yaml`. Sæt `ENV OPENAPI_PATH=/app/openapi.yaml NODE_ENV=production`, `EXPOSE 3000` og `CMD ["node", "src/server.js"]`. Der skal ikke være en `backend/.dockerignore`, fordi rodens `.dockerignore` gælder (den skal indeholde `node_modules`, se T001)

### Docker Compose

- [X] T008 Omskriv `compose.yaml` i roden: behold `name: hotel-kong-artur` og `include: [docker/docker-compose.yml]`. Tilføj service `db` (`image: mysql:8.0`, `restart: unless-stopped`, `env_file: .env`, `environment: TZ: Europe/Copenhagen`, volumes `mysql_data:/var/lib/mysql` og `./db-init:/docker-entrypoint-initdb.d:ro`, **ingen** `ports`) og service `backend` (`build: {context: ., dockerfile: backend/Dockerfile}`, `env_file: .env`, `environment: MYSQL_HOST: db`, `ports: ["3000:3000"]`, `depends_on: db`). Tilføj top-level `volumes: mysql_data:` (research R5)
- [X] T009 Omskriv `docker/docker-compose.yml`: fjern service `db` og volumen `mysql_data`. Behold `app` og volumen `claude_config`. Giv `app` `profiles: [dev]`, `env_file: ../.env` og `environment: MYSQL_HOST: db, MYSQL_PORT: "3306"`. Fjern de hårdkodede `MYSQL_*`-passwords og `depends_on: db` (en included fil kan ikke pege på rod-services, research R5)
- [X] T010 Healthchecks i `compose.yaml`: `db` får `healthcheck: test: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u\"$$MYSQL_USER\" -p\"$$MYSQL_PASSWORD\" --silent"]`, `interval: 5s`, `timeout: 5s`, `retries: 20`, `start_period: 30s` (TCP, så den ikke bliver grøn under init, research R4). `backend` får `depends_on: db: condition: service_healthy` og `healthcheck: test: ["CMD", "node", "-e", "fetch('http://localhost:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]`, `interval: 10s`, `retries: 5`

### Seed

- [X] T011 [P] Opret `db-init/01-schema.sql` med `SET NAMES utf8mb4;` og de fire tabeller fra [data-model.md](data-model.md), alle `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`:
  - `room_type(id INT UNSIGNED AUTO_INCREMENT PK, name VARCHAR(50) NOT NULL UNIQUE, price_low/price_mid/price_high INT UNSIGNED NOT NULL)` med `CHECK (price_low <= price_mid AND price_mid <= price_high)`
  - `booking(id INT UNSIGNED AUTO_INCREMENT PK, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, country VARCHAR(100) NOT NULL, room_type_id INT UNSIGNED NOT NULL FK → room_type.id, nights SMALLINT UNSIGNED NOT NULL, season ENUM('low','mid','high') NOT NULL, total_price INT UNSIGNED NOT NULL, is_historical BOOLEAN NOT NULL DEFAULT FALSE, arrival_date DATE NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)` med `CHECK (nights >= 1)`, `CHECK ((is_historical = TRUE AND arrival_date IS NULL) OR (is_historical = FALSE AND arrival_date IS NOT NULL))` og indeks på `last_name`, `first_name` og `arrival_date`
  - `drink(id INT UNSIGNED AUTO_INCREMENT PK, name VARCHAR(100) NOT NULL UNIQUE, category ENUM('Coffee','Cocktail') NOT NULL, price DECIMAL(8,2) NOT NULL, historical_units_sold INT UNSIGNED NOT NULL DEFAULT 0)`
  - `bar_sale(id INT UNSIGNED AUTO_INCREMENT PK, drink_id INT UNSIGNED NOT NULL FK → drink.id, quantity SMALLINT UNSIGNED NOT NULL, sold_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)` med `CHECK (quantity >= 1)`
- [X] T012 [P] Opret `scripts/generate-seed.js` (Node, kun indbyggede moduler). Scriptet læser `scripts/source/international_names_with_rooms_1000.csv` og `scripts/source/drinks_menu_with_sales.csv` (komma, UTF-8, decimalpunktum) og skriver `db-init/02-seed.sql`. Indhold: en kommentar øverst (genereret af scriptet, kilde ITAKEA/hoteldata, `M�ller` → `Müller` i 54 rækker jf. research R2), `SET NAMES utf8mb4;`, 8 `room_type`-rækker med priserne fra FR-008, 1000 `booking`-rækker (`is_historical = TRUE`, `arrival_date = NULL`, `room_type_id` slås op via `(SELECT id FROM room_type WHERE name = ...)`, Days Rented → `nights`, Season → `season`, Price → `total_price`) og 30 `drink`-rækker (Units Sold → `historical_units_sold`). Strenge escapes for `'`. Scriptet skal fejle, hvis antallet ikke er 1000/30, eller hvis en værelsestype er ukendt. Det udskriver antal rettede navne
- [X] T013 Kør `node scripts/generate-seed.js` og commit den genererede `db-init/02-seed.sql`. Kontrollér i filen: 1000 bookinger, 30 drinks, 54 × `Müller`, ingen `�` og prisen `91.40` for Cosmopolitan
- [x] T014 Validér Setup: `cp .env.example .env` (udfyld), `docker compose down -v`, `docker compose up --build`. Kør derefter [quickstart.md](quickstart.md) trin 1 og 2: kun `db` + `backend` starter, `backend` venter på healthy `db`, `curl localhost:3000/api/health` → `{"status":"ok"}`, `/api-docs` viser alle 25 endpoints, og SQL-tjekket giver 1000/1000/1000, Cocktail 20/Coffee 10 og 54 Müller

**Checkpoint**: Systemet starter med ét `docker compose up`, databasen er seedet, og Swagger UI kører.

---

## Phase 2: Foundational (blokerer alle user stories)

**Purpose**: Fælles fejlhåndtering og drikkedata, som US2 og US3 begge bruger.

- [X] T015 Opret `backend/src/services/errors.js` med klasserne `ValidationError(message, fields)`, `NotFoundError(message)` og `ConflictError(message)`. Udvid fejl-middlewaren i `backend/src/app.js`: `ValidationError` → `400 {"error", "fields"}`, `NotFoundError` → `404 {"error"}`, `ConflictError` → `409 {"error"}`, andre → 500
- [X] T016 [P] Opret `backend/src/repositories/roomTypeRepository.js` med `findByName(name)` og `findAll()` (returnerer `id, name, price_low, price_mid, price_high`)
- [X] T017 [P] Opret `backend/src/repositories/drinkRepository.js` med `findAll()` (`id, name, category, price`, sorteret efter category og name), `findById(id)` og `findAllWithRegisteredUnits()`, der returnerer `id, name, category, price, historical_units_sold` og `registered_units` (`COALESCE(SUM(bar_sale.quantity), 0)` via `LEFT JOIN ... GROUP BY drink.id`, så alle 30 kommer med)
- [X] T018 [P] Skriv `backend/tests/unit/barCalculations.test.js` for `withUnitsSold(rows)`: `units_sold = historical_units_sold + registered_units`, `registered_units` som streng/tal og 0 salg
- [X] T019 Opret `backend/src/services/barCalculations.js` med den rene funktion `withUnitsSold(rows)` og `toOre(price)` (`Math.round(Number(price) * 100)`, research R8), så T018 bliver grøn

**Checkpoint**: Fundamentet er klar. US1, US2 og US3 kan begynde.

---

## Phase 3: User Story 1 – Oprettelse og styring af bookinger (P1) 🎯 MVP

**Goal**: Receptionisten kan oprette, søge, rette og afbestille bookinger via API (og
browser i uge 2). Sæson og pris udregnes automatisk.

**Independent Test**: [quickstart.md](quickstart.md) trin 4. Opret december-booking → `high`,
3600. Ret til 30. nov → `low`, 2700. Ugyldig dato/nætter → 400 med `fields`. Historisk
PUT/DELETE → 409.

### Tests for User Story 1

- [X] T020 [P] [US1] Skriv `backend/tests/unit/bookingRules.test.js`: `seasonForDate` for alle 12 måneder (jan, feb, nov → `low`; mar, apr, maj, sep, okt → `mid`; jun, jul, aug, dec → `high`), `pricePerNight` for alle 8 × 3 kombinationer fra FR-008, `totalPrice` (pr. nat × nætter), ankomst `2026-11-30` + 3 nætter → `low`, `isValidDate` (`2026-02-31`, `2026-13-01`, `26-1-1` og `2028-02-29` gyldig) samt `validateBookingInput` (alle seks felter mangler → seks felter i `fields`, `nights` 0/1.5/366/"3" afvist, navne over 100 tegn afvist, tom streng efter trim afvist)

### Implementation for User Story 1

- [X] T021 [US1] Opret `backend/src/services/bookingRules.js` med rene funktioner, så T020 bliver grøn:
  - `seasonForDate(dateString)`, kun ud fra måneden (FR-007)
  - `pricePerNight(roomType, season)` med `price_low/mid/high`
  - `totalPrice(perNight, nights)`
  - `isValidDate(s)`: `^\d{4}-\d{2}-\d{2}$` + `Date.UTC`-tjek af år/måned/dag
  - `validateBookingInput(body)`: returnerer en liste af fejlfelter efter data-model.md. `first_name`, `last_name`, `country` er "mangler, ikke tekst, tom efter trim eller > 100 tegn". `room_type` er "mangler" (eksistens tjekkes i service). `arrival_date` er "mangler, ikke `YYYY-MM-DD` eller ikke en rigtig dato". `nights` er "mangler, ikke et heltal eller uden for 1–365". `season`, `total_price` og `is_historical` i input ignoreres
- [X] T022 [P] [US1] Opret `backend/src/repositories/bookingRepository.js`. Alle forespørgsler joiner `room_type` og returnerer `room_type` som navn plus `is_historical` som boolean. Funktioner:
  - `findAll(search)`: uden `search` alle sorteret `id DESC`. Med `search` `WHERE first_name LIKE ? OR last_name LIKE ? OR CONCAT(first_name,' ',last_name) LIKE ?` med `%search%`
  - `findById(id)`
  - `create({first_name, last_name, country, room_type_id, nights, season, total_price, arrival_date})` med `is_historical = FALSE`. Returnerer id
  - `update(id, {...})`
  - `remove(id)`
- [X] T023 [US1] Opret `backend/src/services/bookingService.js`:
  - `list(search)`: `search` trimmes, max 100 tegn
  - `get(id)`: ugyldigt id (ikke et positivt heltal) → `ValidationError(['id'])`. Ukendt → `NotFoundError('Booking {id} findes ikke')`
  - `create(body)`: kald `validateBookingInput` og `roomTypeRepository.findByName`. Ukendt `room_type` lægges i `fields`, og alle fejl samles i én `ValidationError` med dansk besked, der nævner felterne. Udregn sæson og pris med `bookingRules`, og gem
  - `update(id, body)`: findes ikke → 404, `is_historical` → `ConflictError('Booking {id} er historisk og kan ikke ændres eller slettes')`. Ellers valider og genberegn som `create`
  - `remove(id)`: samme 404/409-regler
- [X] T024 [US1] Opret `backend/src/controllers/bookingController.js` og routes i `backend/src/routes.js`:
  - `GET /api/bookings?search=` → 200 array
  - `GET /api/bookings/:id` → 200
  - `POST /api/bookings` → 201 + `Location: /api/bookings/{id}` + booking
  - `PUT /api/bookings/:id` → 200 + booking
  - `DELETE /api/bookings/:id` → 204 uden body
  - Svarformat som kontraktens `Booking`. Controlleren kalder kun `bookingService`
- [ ] T025 [US1] **(uge 2)** Opret `backend/public/bookings.html`, `backend/public/js/bookings.js` og `backend/public/css/style.css`: formular (fornavn, efternavn, land, værelsestype som dropdown med de 8 typer, ankomstdato, nætter), liste med søgefelt, ret- og slet-knapper (skjult for historiske) og visning af `error` og `fields` fra 400/409. Kun `fetch` mod `/api/bookings` (FR-014). Link fra `backend/public/index.html`
- [X] T026 [US1] Validér US1 med [quickstart.md](quickstart.md) trin 3 (`npm test` grøn) og trin 4 (alle rækker i tabellen) via curl og Swagger UI (FR-015)

**Checkpoint**: US1 virker alene. Det er MVP.

---

## Phase 4: User Story 2 – Live overblik over belægning og omsætning (P2)

**Goal**: Administratoren ser samlet indtjening, fordelinger, belægning pr. nat og mest solgte
kaffe/cocktail. Tableau henter de samme tal som CSV.

**Independent Test**: [quickstart.md](quickstart.md) trin 5. Total 11234034, fordelinger
summerer til totalen, belægning 0 → 0.5 % efter ny booking, Espresso 14656 / Whiskey Sour 3824.

### Tests for User Story 2

- [ ] T027 [P] [US2] Skriv `backend/tests/unit/kpiCalculations.test.js`:
  - `totalRevenue` (inkl. tom liste → 0)
  - `revenueBy(rows, key)`: sorteret faldende, og summen er lig totalen
  - `occupancyForDate(stays, date)`: ankomst 6/12 + 3 nætter tæller 6., 7. og 8./12., men ikke 9./12. Månedsskifte 30/11 + 3. `booked_rooms / 214 × 100` afrundet til 1 decimal, 1 værelse → 0.5
  - `occupancyPerNight(stays)`: alle nætter fra tidligste til seneste, tom → `[]`
  - `topDrinks(rows)`: én pr. kategori og alle ved uafgjort
- [ ] T028 [P] [US2] Skriv `backend/tests/unit/csv.test.js` for `toCsv(columns, rows)`: header, komma, felter med `,` eller `"` eller linjeskift citeres, og `"` fordobles. `null` giver et tomt felt. Linjeskift er `\n`

### Implementation for User Story 2

- [ ] T029 [US2] Opret `backend/src/services/kpiCalculations.js` med de rene funktioner fra T027 og konstanten `CAPACITY = 214` (princip VII). Datoaritmetik i UTC (research R8), så T027 bliver grøn
- [ ] T030 [P] [US2] Opret `backend/src/services/csv.js` med `toCsv(columns, rows)`, så T028 bliver grøn
- [ ] T031 [US2] Udvid `backend/src/repositories/bookingRepository.js` med `findRevenueRows()` (`country, room_type`-navn, `season, total_price` for alle bookinger) og `findDatedStays()` (`arrival_date, nights` hvor `arrival_date IS NOT NULL`). Ingen `SUM` eller `GROUP BY` her, da nøgletal beregnes i services (princip V)
- [ ] T032 [US2] Opret `backend/src/services/kpiService.js`:
  - `getTotal()` → `{total_revenue, booking_count}`
  - `getRevenueByCountry()`, `getRevenueByRoomType()`, `getRevenueBySeason()` → `[{key, revenue, booking_count}]`
  - `getOccupancy(date)`: ugyldig/manglende dato → `ValidationError(['date'])`. Returnerer `{date, booked_rooms, capacity, occupancy_percent}`
  - `getOccupancyPerNight()`
  - `getTopDrinks()`: `drinkRepository.findAllWithRegisteredUnits` → `withUnitsSold` → `topDrinks`, så historiske + nye salg tæller med. Returnerer `{coffee: [...], cocktail: [...]}`
- [ ] T033 [US2] Opret `backend/src/controllers/kpiController.js` og routes: `GET /api/kpi/revenue/total`, `/api/kpi/revenue/by-country`, `/api/kpi/revenue/by-room-type`, `/api/kpi/revenue/by-season`, `/api/kpi/occupancy?date=` og `/api/kpi/top-drinks` efter kontrakten
- [ ] T034 [US2] Opret `backend/src/services/exportService.js` og `backend/src/controllers/exportController.js` med routes for `GET /api/export/revenue-by-country.csv`, `revenue-by-room-type.csv` og `revenue-by-season.csv` (`key,revenue,booking_count`), `occupancy.csv` (`date,booked_rooms,capacity,occupancy_percent`) og `top-drinks.csv` (`category,name,units_sold`). `exportService` kalder **kun** `kpiService` og `csv.toCsv` og beregner intet selv (research R7). Controlleren sætter `Content-Type: text/csv; charset=utf-8`
- [ ] T035 [US2] **(uge 2)** Opret `backend/public/overview.html` og `backend/public/js/overview.js`: samlet indtjening, tre fordelingstabeller, datovælger til belægning (vis %) og mest solgte kaffe/cocktail. Kun `fetch` mod `/api/kpi/*`. Link fra `backend/public/index.html`
- [ ] T036 [US2] Validér US2 med [quickstart.md](quickstart.md) trin 5 inkl. "Live" (opret booking → tal ændres ved næste kald) og de tilsvarende CSV'er

**Checkpoint**: US1 og US2 virker hver for sig.

---

## Phase 5: User Story 3 – Registrering af barsalg (P3)

**Goal**: Helene registrerer salg, og barens oversigt viser total, omsætning pr. drink og
kaffe/cocktail-fordeling. Tableau får de samme tal.

**Independent Test**: [quickstart.md](quickstart.md) trin 6. Total 179958 enheder /
13448640.34 DKK, 52.83 / 47.17 %, +2 Espresso → +138.20, antal 0 → 400.

### Tests for User Story 3

- [ ] T037 [P] [US3] Udvid `backend/tests/unit/barCalculations.test.js` med tests af:
  - `revenueByDrink(rows)`: alle drinks med også 0 salg. Omsætning = enheder × pris regnet i øre, fx `69.10 × 2 = 138.20`
  - `barTotal(rows)` → `{units_sold, revenue}`
  - `categorySplit(rows)`: Cocktail afrundes til 2 decimaler, Coffee = 100 − Cocktail, summen præcis 100, uden salg begge 0
  - `validateSaleInput(body)`: `drink_id` mangler eller ikke et positivt heltal. `quantity` mangler, ikke et heltal eller uden for 1–1000

### Implementation for User Story 3

- [ ] T038 [US3] Udvid `backend/src/services/barCalculations.js` med `revenueByDrink`, `barTotal`, `categorySplit` og `validateSaleInput` fra T037. Beløb summeres i øre og returneres i kroner med 2 decimaler, så T037 bliver grøn
- [ ] T039 [P] [US3] Opret `backend/src/repositories/barSaleRepository.js` med `create({drink_id, quantity})` (`sold_at` sættes af DB-default) og `findById(id)` (`id, drink_id, quantity, sold_at`)
- [ ] T040 [US3] Opret `backend/src/services/barService.js`:
  - `listDrinks()`
  - `registerSale(body)`: `validateSaleInput` og `drinkRepository.findById`. Ukendt drink → `ValidationError(['drink_id'])`. Returnerer det gemte salg
  - `getTotal()`, `getRevenueByDrink()`, `getCategorySplit()`: alle via `findAllWithRegisteredUnits` → `withUnitsSold` → beregning
- [ ] T041 [US3] Opret `backend/src/controllers/barController.js` og routes: `GET /api/bar/drinks`, `POST /api/bar/sales` (201), `GET /api/bar/kpi/total`, `/api/bar/kpi/revenue-by-drink` og `/api/bar/kpi/category-split` efter kontrakten
- [ ] T042 [US3] Udvid `backend/src/services/exportService.js` og `backend/src/controllers/exportController.js` med `GET /api/export/revenue-by-drink.csv` (`drink_id,name,category,price,historical_units,registered_units,units_sold,revenue`), `bar-category-split.csv` (`category,units_sold,revenue,percent`) og `kpi-totals.csv` (`metric,value` med `booking_revenue_total`, `booking_count`, `bar_units_sold`, `bar_revenue` fra `kpiService.getTotal` og `barService.getTotal`). Kun kald til services + `toCsv`
- [ ] T043 [US3] **(uge 2)** Opret `backend/public/bar.html` og `backend/public/js/bar.js`: drikkevarer grupperet i Kaffe/Cocktails som store knapper, antal (standard 1), "Registrér" (SC-003: under 15 sek.), visning af total, omsætning pr. drink og procentfordeling. Kun `fetch` mod `/api/bar/*`. Link fra `backend/public/index.html`
- [ ] T044 [US3] Validér US3 med [quickstart.md](quickstart.md) trin 6 og trin 7 (Tableau: alle 8 CSV'er = JSON-tal, "live" efter nyt salg)

**Checkpoint**: Alle tre user stories virker.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T045 [P] Opret `README.md` i roden: formål, `cp .env.example .env`, `docker compose up --build`, `docker compose down -v` første gang, URL'er (`/`, `/api-docs`), `npm test`, dev-container (`docker compose --profile dev up -d app`) og Tableau-flowet. Opdatér `db-init/README.md` med, hvordan `02-seed.sql` genskabes
- [ ] T046 [P] Kontrollér, at hver route i `backend/src/routes.js` findes i `specs/001-booking-kpi-bar/contracts/openapi.yaml` med samme metode, sti, statuskoder og svarfelter, og omvendt (princip IV). Ret forskelle i samme commit
- [ ] T047 Konstitutionstjek ([quickstart.md](quickstart.md) trin 8): SQL kun i `backend/src/repositories/`, ingen beregninger i `controllers/`, ingen hemmeligheder i trackede filer, kun de fire afhængigheder i `backend/package.json`
- [ ] T048 Byg Tableau Public-dashboardet ud fra de 8 CSV'er (`tableau/`-mappen gitignores) med omsætning pr. land, værelsestype og sæson, belægning pr. nat, topdrinks, omsætning pr. drink og kategorifordeling. Tjek SC-007 mod JSON-tallene
- [ ] T049 Kør hele [quickstart.md](quickstart.md) fra en tom volumen (`docker compose down -v`) og ret eventuelle afvigelser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T014)**: ingen forudsætninger
  - T003–T006 kræver T001
  - T005 og T006 kræver T004
  - T007 kræver T001
  - T010 kræver T008
  - T013 kræver T011 og T012
  - T014 kræver alle andre Setup-tasks
- **Foundational (T015–T019)**: kræver Setup. Blokerer alle user stories
- **US1 (T020–T026)**: kræver Foundational
- **US2 (T027–T036)**: kræver Foundational. Bruger `bookingRepository` fra T022, så lav US1 først eller koordinér filen
- **US3 (T037–T044)**: kræver Foundational. T042 (`kpi-totals.csv`) kræver `kpiService` fra T032
- **Polish (T045–T049)**: kræver de ønskede user stories

### User Story Dependencies

- **US1 (P1)**: ingen afhængighed af andre stories
- **US2 (P2)**: deler fil med US1 (`bookingRepository.js`), men kan testes alene på seed-data
- **US3 (P3)**: uafhængig af US1. Kun `kpi-totals.csv` i T042 bruger US2's `kpiService`

### Within Each User Story

- Test (fejler) → ren funktion (grøn) → repository → service → controller/routes → frontend (uge 2) → validering

## Parallel Opportunities

- **Setup**: T002, T011 og T012 kan laves samtidig med backend-skelettet (T001–T007)
- **Foundational**: T016, T017 og T018 parallelt
- **US1**: T020 og T022 parallelt
- **US2**: T027, T028 og T030 parallelt
- **US3**: T037 og T039 parallelt
- **Efter Foundational**: US1, US2 og US3 kan fordeles på tre personer (se afhængigheder ovenfor)

## Parallel Example: Setup (i dag)

```text
Person A: T001 → T003 → T004 → T005 → T006 → T007   (backend-skelet, health, Swagger, Dockerfile)
Person B: T002 → T008 → T009 → T010                 (.env.example + compose + healthchecks)
Person C: T011, T012 → T013                         (schema + seed)
Alle:     T014                                       (docker compose up + quickstart trin 1–2)
```

## Parallel Example: User Story 1

```text
Task: "T020 Skriv backend/tests/unit/bookingRules.test.js"
Task: "T022 Opret backend/src/repositories/bookingRepository.js"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1: Setup → `docker compose up` virker, seed er indlæst
2. Phase 2: Foundational
3. Phase 3: US1 → valider med quickstart trin 3–4
4. **STOP og demo**

### Incremental Delivery

1. Setup + Foundational → fundament
2. US1 → bookinger (MVP)
3. US2 → nøgletal + Tableau-CSV'er
4. US3 → barsalg + bar-CSV'er
5. Uge 2: frontend-tasks T025, T035 og T043
6. Polish

## Notes

- Én task ad gangen. Et gruppemedlem gennemgår, og den der gav opgaven, committer (princip XI)
- Endpoint ændret → `contracts/openapi.yaml` opdateres i samme commit (princip IV)
- [P] = andre filer og ingen afhængighed af ufærdige tasks

---

## Phase 7: Convergence

- [ ] T050 Kør quickstart trin 4 scenarie 1 (POST → 201, `high`, 3600) og 8 (PUT/DELETE `/api/bookings/1` → 409) via "Try it out" i Swagger UI på `/api-docs`, og gem screenshots, så T026's "via curl og Swagger UI" er opfyldt per FR-015 (partial)
- [X] T051 Opdatér teksten i T001 eller plan.md med test-scriptet `"test": "node --test tests/unit/*.test.js"` og begrundelsen (Node 22+ accepterer ikke en mappe som argument til `node --test`) per T001 / Constitution X (contradicts)
