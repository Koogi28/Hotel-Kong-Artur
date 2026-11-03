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

**Tillægsopgave uge 2 (02/11)**: Phase 9 (PostgreSQL, T057–T066) → Phase 10 (fælles frontend efter
styleguiden, T067–T069) → T025, T035, T043 → Phase 11 (verificering, T070–T072). Færdige tasks
fra uge 1, der nævner MySQL (fx T003, T008–T011), beskriver MySQL-versionen i tagget
`uge1-mysql`. De bliver ikke ændret, men afløst af Phase 9.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Kan laves parallelt (andre filer, ingen afhængighed af ufærdige tasks)
- **[Story]**: US1, US2 eller US3
- Stier er relative til repo-roden

## Lagregler (gælder alle tasks, princip II)

- `controllers/`: kun HTTP ind/ud (læs params/body, kald service, sæt status, send JSON).
  Ingen SQL, ingen beregninger.
- `services/`: validering, sæson, pris, nøgletal. Rene funktioner ligger i `*Rules.js` og
  `*Calculations.js`. `*Service.js` henter rækker fra repositories og kalder dem.
- Nøgletalssvar er flade (et objekt eller et array af objekter uden nestede felter), så
  Tableau kan læse dem med JSONPath `$` eller `$[*]` (research R7).
- `repositories/`: al SQL (`pg`, parametriserede `$1, $2, ...`-forespørgsler, ingen ORM).
  *(rettet 02/11: før `mysql2/promise` og `?`, research R11)*
- `public/`: kun `fetch` mod API'et, ingen beregning af nøgletal, sæson eller pris (FR-029).
  Al styling i `public/css/style.css` med tokens fra research R12 (FR-031).
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
- [x] T014 Validér Setup: `cp .env.example .env` (udfyld), `docker compose down -v`, `docker compose up --build`. Kør derefter [quickstart.md](quickstart.md) trin 1 og 2: kun `db` + `backend` starter, `backend` venter på healthy `db`, `curl localhost:3000/api/health` → `{"status":"ok"}`, `/api-docs` viser alle 25 endpoints (nu 18, se R7), og SQL-tjekket giver 1000/1000/1000, Cocktail 20/Coffee 10 og 54 Müller

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
- [X] T025 [US1] **(uge 2, omskrevet 02/11)** Kræver T067–T069. Opret `backend/public/bookings.html` og `backend/public/js/bookings.js` med fælles header, `css/style.css` og `js/api.js` (ikke en egen CSS-fil). Formular (fornavn, efternavn, land, værelsestype som dropdown med de 8 typer, ankomstdato, nætter), liste med søgefelt, ret- og slet-knapper (skjult for historiske) og visning af `error` og `fields` fra 400/409. 400: strimmel under hvert felt i `fields` (`.field-error`, som "Nødvendig information" på hotellets bookingside). 409 og 500: `.alert--error`. Oprettet, rettet og slettet: `.alert--success`. Slet-knappen er `.button--danger` og kræver `confirm()`. Sæson og samlet pris vises fra API'ets svar og udregnes ikke i browseren. Listen er en tabel i `.table-wrap`. Kun `fetch` mod `/api/bookings` (FR-014, FR-029). Følg `styleguide/style.md` og research R12 (FR-031, FR-032)
- [X] T026 [US1] Validér US1 med [quickstart.md](quickstart.md) trin 3 (`npm test` grøn) og trin 4 (alle rækker i tabellen) via curl og Swagger UI (FR-015)

**Checkpoint**: US1 virker alene. Det er MVP.

---

## Phase 4: User Story 2 – Live overblik over belægning og omsætning (P2)

**Goal**: Administratoren ser samlet indtjening, fordelinger, belægning pr. nat og mest solgte
kaffe/cocktail. Tableau henter data som JSON via REST API Connector og summerer rå rækker fra
`/api/bookings` (ændret 03/11, research R7). Tallene skal være de samme (SC-008, T070).

**Independent Test**: [quickstart.md](quickstart.md) trin 5. Total 11234034, fordelinger
summerer til totalen, belægning 0 → 0.5 % efter ny booking, Espresso 14656 / Whiskey Sour 3824.

### Tests for User Story 2

- [X] T027 [P] [US2] Skriv `backend/tests/unit/kpiCalculations.test.js`:
  - `totalRevenue` (inkl. tom liste → 0)
  - `revenueBy(rows, key)`: sorteret faldende, og summen er lig totalen
  - *(tilføjet 30/10)* Konstanten `SEASONS = ['low', 'mid', 'high']` i `kpiCalculations.js` (eksporteres, så testen kan bruge den)
  - *(tilføjet 30/10)* `revenueByRoomTypeSeason(rows, roomTypeNames)`: altid 8 × 3 = 24 rækker `{room_type, season, revenue, booking_count}`, også 0 for kombinationer uden bookinger. Sorteret efter værelsestype (rækkefølgen i `roomTypeNames`) og sæson (low, mid, high), og summen er lig totalen
  - `occupancyForDate(stays, date)`: ankomst 6/12 + 3 nætter tæller 6., 7. og 8./12., men ikke 9./12. Månedsskifte 30/11 + 3. `booked_rooms / 214 × 100` afrundet til 1 decimal, 1 værelse → 0.5
  - `occupancyPerNight(stays)`: alle nætter fra tidligste til seneste, tom → `[]`
  - `topDrinks(rows)`: fladt array `[{category, drink_id, name, units_sold}]`, én pr. kategori og alle ved uafgjort
- ~~T028~~ **Udgået (29/10)**: `csv.test.js` er ikke nødvendig, fordi CSV-eksport er fravalgt. Tableau læser JSON (research R7)

### Implementation for User Story 2

- [X] T029 [US2] Opret `backend/src/services/kpiCalculations.js` med de rene funktioner fra T027 og konstanten `CAPACITY = 214` (princip VII). Datoaritmetik i UTC (research R8), så T027 bliver grøn
- ~~T030~~ **Udgået (29/10)**: `csv.js` er ikke nødvendig, fordi CSV-eksport er fravalgt (research R7)
- [X] T031 [US2] Udvid `backend/src/repositories/bookingRepository.js` med `findRevenueRows()` (`country, room_type`-navn, `season, total_price` for alle bookinger) og `findDatedStays()` (`arrival_date, nights` hvor `arrival_date IS NOT NULL`). Ingen `SUM` eller `GROUP BY` her, da nøgletal beregnes i services (princip V)
- [X] T032 [US2] Opret `backend/src/services/kpiService.js`:
  - `getTotal()` → `{total_revenue, booking_count}`
  - `getRevenueByCountry()`, `getRevenueByRoomType()`, `getRevenueBySeason()` → `[{key, revenue, booking_count}]`
  - *(tilføjet 30/10)* `getRevenueByRoomTypeSeason()`: `bookingRepository.findRevenueRows` + navnene fra `roomTypeRepository.findAll` → `revenueByRoomTypeSeason`. Returnerer 24 rækker `[{room_type, season, revenue, booking_count}]`
  - `getOccupancy(date)`: ugyldig/manglende dato → `ValidationError(['date'])`. Returnerer `{date, booked_rooms, capacity, occupancy_percent}`
  - `getOccupancyPerNight()` → `[{date, booked_rooms, capacity, occupancy_percent}]` for hver nat fra den tidligste til den seneste dækkede nat, `[]` uden bookinger med ankomstdato
  - `getTopDrinks()`: `drinkRepository.findAllWithRegisteredUnits` → `withUnitsSold` → `topDrinks`, så historiske + nye salg tæller med. Returnerer et fladt array `[{category, drink_id, name, units_sold}]`
- [X] T033 [US2] Opret `backend/src/controllers/kpiController.js` og routes: `GET /api/kpi/revenue/total`, `/api/kpi/revenue/by-country`, `/api/kpi/revenue/by-room-type`, `/api/kpi/revenue/by-season`, `/api/kpi/revenue/by-room-type-season` *(tilføjet 30/10, kontrakt 2.1.0)*, `/api/kpi/occupancy?date=` og `/api/kpi/top-drinks` efter kontrakten
- [X] T034 [US2] *(omskrevet 29/10, før: CSV-eksport)* Tilføj route `GET /api/kpi/occupancy/nights` i `backend/src/controllers/kpiController.js` og `backend/src/routes.js`, der kalder `kpiService.getOccupancyPerNight()` og svarer med et fladt array efter kontrakten. Tjek i Swagger UI, at alle `/api/kpi/*`-svar er flade (research R7)
- [X] T035 [US2] **(uge 2, omskrevet 02/11)** Kræver T067–T069. Opret `backend/public/overview.html` og `backend/public/js/overview.js` med fælles header, `css/style.css` og `js/api.js`. Samlet indtjening og antal bookinger som `.kpi`-kort, tre fordelingstabeller, datovælger til belægning (vis %) og mest solgte kaffe/cocktail. *(tilføjet 30/10)* Tabel over indtjening pr. værelsestype pr. sæson fra `by-room-type-season` med en sæson-dropdown (alle/low/mid/high), der kun filtrerer de hentede rækker i browseren. *(tilføjet 02/11, SC-008)* Tabel over belægning pr. nat fra `/api/kpi/occupancy/nights` (dato, bookede værelser, %), da den også er i Tableau-dashboardet (T048) *(03/11: ikke med i det byggede dashboard, research R7. Tabellen bliver, fordi FR-018 vises i overblikket)*. Uden data vises "Ingen bookinger med ankomstdato endnu". Ingen beregning i frontend: procenter, summer og sortering kommer fra API'et. Kun `fetch` mod `/api/kpi/*` (FR-028, FR-029). Følg `styleguide/style.md` og research R12 (FR-031, FR-032)
- [X] T036 [US2] Validér US2 med [quickstart.md](quickstart.md) trin 5 (inkl. `by-room-type-season`: 24 rækker, Σ 11234034 – genåbnet 30/10) inkl. "Live" (opret booking → tal ændres ved næste kald, også i `occupancy/nights`)

**Checkpoint**: US1 og US2 virker hver for sig.

---

## Phase 5: User Story 3 – Registrering af barsalg (P3)

**Goal**: Helene registrerer salg, og barens oversigt viser total, omsætning pr. drink og
kaffe/cocktail-fordeling. Tableau summerer rå rækker fra `bar/kpi/revenue-by-drink` og skal
give de samme tal (ændret 03/11, SC-008).

**Independent Test**: [quickstart.md](quickstart.md) trin 6. Total 179958 enheder /
13448640.34 DKK, 52.83 / 47.17 %, +2 Espresso → +138.20, antal 0 → 400.

### Tests for User Story 3

- [X] T037 [P] [US3] Udvid `backend/tests/unit/barCalculations.test.js` med tests af:
  - `revenueByDrink(rows)`: alle drinks med også 0 salg, med felterne `historical_units`, `registered_units` og `units_sold`. Omsætning = enheder × pris regnet i øre, fx `69.10 × 2 = 138.20`
  - `barTotal(rows)` → `{units_sold, revenue}`
  - `categorySplit(rows)`: `[{category, units_sold, revenue, percent}]`. Cocktail afrundes til 2 decimaler, Coffee = 100 − Cocktail, summen præcis 100, uden salg begge 0
  - `validateSaleInput(body)`: `drink_id` mangler eller ikke et positivt heltal. `quantity` mangler, ikke et heltal eller uden for 1–1000

### Implementation for User Story 3

- [X] T038 [US3] Udvid `backend/src/services/barCalculations.js` med `revenueByDrink`, `barTotal`, `categorySplit` og `validateSaleInput` fra T037. Beløb summeres i øre og returneres i kroner med 2 decimaler, så T037 bliver grøn
- [X] T039 [P] [US3] Opret `backend/src/repositories/barSaleRepository.js` med `create({drink_id, quantity})` (`sold_at` sættes af DB-default) og `findById(id)` (`id, drink_id, quantity, sold_at`)
- [X] T040 [US3] Opret `backend/src/services/barService.js`:
  - `listDrinks()`
  - `registerSale(body)`: `validateSaleInput` og `drinkRepository.findById`. Ukendt drink → `ValidationError(['drink_id'])`. Returnerer det gemte salg
  - `getTotal()`, `getRevenueByDrink()`, `getCategorySplit()`: alle via `findAllWithRegisteredUnits` → `withUnitsSold` → beregning
- [X] T041 [US3] Opret `backend/src/controllers/barController.js` og routes: `GET /api/bar/drinks`, `POST /api/bar/sales` (201), `GET /api/bar/kpi/total`, `/api/bar/kpi/revenue-by-drink` og `/api/bar/kpi/category-split` efter kontrakten. Svar er flade (R7)
- ~~T042~~ **Udgået (29/10)**: Bar-CSV'erne er fravalgt. Felterne fra `revenue-by-drink.csv` og `bar-category-split.csv` ligger nu i JSON-svarene (T037/T038/T041), og `kpi-totals.csv` dækkes af `kpi/revenue/total` + `bar/kpi/total` (research R7)
- [X] T043 [US3] **(uge 2, omskrevet 02/11)** Kræver T067–T069. Opret `backend/public/bar.html` og `backend/public/js/bar.js` med fælles header, `css/style.css` og `js/api.js`. Drikkevarer grupperet i Kaffe/Cocktails som store knapper, antal (standard 1), "Registrér" (SC-003: under 15 sek.), visning af total, omsætning pr. drink og procentfordeling. Knapperne er mindst 48 px høje, så de er nemme at ramme på en tablet. Efter et salg vises `.alert--success` ("2 × Espresso registreret"), og nøgletallene hentes igen fra API'et (browseren lægger ikke selv tallene sammen). Antal 0 eller ukendt drink → fejl fra 400 vises som i T025. Kun `fetch` mod `/api/bar/*` (FR-028, FR-029). Følg `styleguide/style.md` og research R12 (FR-031, FR-032)
- [X] T044 [US3] Validér US3 med [quickstart.md](quickstart.md) trin 6 og trin 7 (Tableau Desktop via REST API Connector: alle KPI-endpoints giver samme tal som i Swagger UI, og nye tal vises efter tilføjet data → *Data → Refresh*)

**Checkpoint**: Alle tre user stories virker.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T045 [P] Opret `README.md` i roden: formål, `cp .env.example .env`, `docker compose up --build`, `docker compose down -v` første gang, URL'er (`/`, `/api-docs`), `npm test`, dev-container (`docker compose --profile dev up -d app`) og Tableau-flowet. Opdatér `db-init/README.md` med, hvordan `02-seed.sql` genskabes
- [X] T046 [P] Kontrollér, at hver route i `backend/src/routes.js` findes i `specs/001-booking-kpi-bar/contracts/openapi.yaml` med samme metode, sti, statuskoder og svarfelter, og omvendt (princip IV). Ret forskelle i samme commit
- [X] T047 Konstitutionstjek ([quickstart.md](quickstart.md) trin 8): SQL kun i `backend/src/repositories/`, ingen beregninger i `controllers/`, ingen hemmeligheder i trackede filer, kun de fire afhængigheder i `backend/package.json`
- [X] T048 *(ændret 03/11, research R7)* Tableau Desktop-dashboardet er bygget med REST API Connector og to datakilder (se [quickstart.md](quickstart.md) trin 7): `GET /api/bookings` (`$[*]`), hvor Tableau summerer indtjening i alt, pr. land, pr. værelsestype og pr. sæson samt antal bookinger pr. land (kort), med filtre på `season` og `country` på tværs af ark (konstitution 5.1.0, princip IV), og `GET /api/bar/kpi/revenue-by-drink` (`$[*]`), hvor Tableau summerer barens total, beregner fordelingen mellem Cocktail og Coffee som "Percent of Total" på `SUM(revenue)` pr. `category` og viser gruppens eget nøgletal i det separate ark "Mest solgte": den mest solgte kaffe og cocktail efter `units_sold`, med filteret `[units_sold] = {FIXED [category] : MAX([units_sold])}` på datakilden `bar/kpi/revenue-by-drink` (FR-019, ingen tredje datakilde, quickstart trin 7). **Færdig 03/11**: SC-007 tjekket med startdata (`docker compose down -v`, *Refresh*, alle filtre *(All)*). Alle 10 nøgletal har samme værdi i Tableau, Swagger UI og frontenden, og live-testen gav de nye tal efter *Refresh* (converge.md, Converge #2)
  - ~~Oprindelig tekst: Byg Tableau Desktop-dashboardet med REST API Connector mod KPI-endpoints (JSONPath `$` / `$[*]`, se quickstart trin 7) med omsætning pr. land, værelsestype og sæson, omsætning pr. værelsestype pr. sæson (datakilde `kpi/revenue/by-room-type-season`, JSONPath `$[*]`, `season` som filter), belægning pr. nat, topdrinks, omsætning pr. drink og kategorifordeling. Tjek SC-007 mod JSON-tallene i Swagger UI~~
- [ ] T049 Kør hele [quickstart.md](quickstart.md) fra en tom volumen (`docker compose down -v`) og ret eventuelle afvigelser. Når frontenden findes (uge 2), køres også trin 9 (frontend), og tidsmålene måles i browseren: en ny booking oprettes på under 2 minutter (SC-001), og et barsalg registreres på under 15 sekunder (SC-003)

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
- **US3 (T037–T044)**: kræver Foundational
- **Polish (T045–T049)**: kræver de ønskede user stories
- **Phase 9 PostgreSQL (T057–T066)**: kræver, at uge 1 er gemt (tag `uge1-mysql`). Blokerer al videre test mod databasen, frontend-tasks og T048/T049
  - T059 kræver T058. T063 og T064 kræver T059
  - T061 kræver T060 (skemaet skal findes, før seed kan testes)
  - T066 kræver alle andre tasks i Phase 9
- **Phase 10 fælles frontend (T067–T069)**: kræver T066 (frontenden testes mod PostgreSQL). T069 kræver T067. Blokerer T025, T035 og T043
- **T025, T035, T043**: kræver T067–T069. Kan derefter laves parallelt (forskellige filer)
- **Phase 11 verificering (T070–T072)**: T070 kræver T035, T043 og T048. T071 kræver T025, T035 og T043. T072 kræver T070 og T071

### User Story Dependencies

- **US1 (P1)**: ingen afhængighed af andre stories
- **US2 (P2)**: deler fil med US1 (`bookingRepository.js`), men kan testes alene på seed-data
- **US3 (P3)**: uafhængig af US1 og US2

### Within Each User Story

- Test (fejler) → ren funktion (grøn) → repository → service → controller/routes → frontend (uge 2) → validering

## Parallel Opportunities

- **Setup**: T002, T011 og T012 kan laves samtidig med backend-skelettet (T001–T007)
- **Foundational**: T016, T017 og T018 parallelt
- **US1**: T020 og T022 parallelt
- **US2**: T027 kan skrives, mens T031 laves (T028 og T030 er udgået)
- **US3**: T037 og T039 parallelt
- **Efter Foundational**: US1, US2 og US3 kan fordeles på tre personer (se afhængigheder ovenfor)
- **Phase 9**: T057, T060, T062 og T065 parallelt med T058 → T059. T063 og T064 parallelt efter T059
- **Phase 10**: T068 parallelt med T067. T069 efter T067
- **Uge 2-frontend**: T025, T035 og T043 parallelt efter Phase 10 (tre personer, tre sider)

## Parallel Example: Setup (i dag)

```text
Person A: T001 → T003 → T004 → T005 → T006 → T007   (backend-skelet, health, Swagger, Dockerfile)
Person B: T002 → T008 → T009 → T010                 (.env.example + compose + healthchecks)
Person C: T011, T012 → T013                         (schema + seed)
Alle:     T014                                       (docker compose up + quickstart trin 1–2)
```

## Parallel Example: Tillægsopgave uge 2

```text
Person A: T058 → T059 → T063                       (pg, db.js, bookingRepository)
Person B: T057, T062, T060 → T061                  (.env.example, compose, schema, seed)
Person C: T065, derefter T064 (efter T059)         (docs, øvrige repositories)
Alle:     T066                                     (SC-009: samme tal som uge1-mysql)
Person A: T067 → T069 → T025                       (style.css, index.html, bookinger)
Person B: T068 → T035                              (api.js, overblik)
Person C: T043 (efter T067–T069)                   (bar)
Alle:     T070 → T071 → T072
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
3. US2 → nøgletal (JSON, også til Tableau)
4. US3 → barsalg + barens nøgletal (JSON, også til Tableau)
5. Uge 2 (tillægsopgave): Phase 9 PostgreSQL → **STOP: samme tal som `uge1-mysql`** (T066) →
   Phase 10 fælles frontend → T025, T035, T043 → Phase 11 verificering
6. Polish

## Notes

- Én task ad gangen. Et gruppemedlem gennemgår, og den der gav opgaven, committer (princip XI)
- Endpoint ændret → `contracts/openapi.yaml` opdateres i samme commit (princip IV)
- [P] = andre filer og ingen afhængighed af ufærdige tasks

---

## Phase 7: Convergence

- [X] T050 Kør quickstart trin 4 scenarie 1 (POST → 201, `high`, 3600) og 8 (PUT/DELETE `/api/bookings/1` → 409) via "Try it out" i Swagger UI på `/api-docs`, og gem screenshots, så T026's "via curl og Swagger UI" er opfyldt per FR-015 (partial)
- [X] T051 Opdatér teksten i T001 eller plan.md med test-scriptet `"test": "node --test tests/unit/*.test.js"` og begrundelsen (Node 22+ accepterer ikke en mappe som argument til `node --test`) per T001 / Constitution X (contradicts)

## Phase 8: Convergence

- [X] T052 Opret `CONTRIBUTE.md` i repo-roden med opsætning (`.env` fra `.env.example`, `.specify/feature.json`, `docker compose up -d --build`), branch- og commit-regler, review via pull request før merge til `main`, Spec Kit-workflowet (specify → clarify → plan → tasks → analyze → implement → converge) og hvem der står bag git-navnene "K" og "K-Workstation" (Pin Yuan L.) per plan: Afleveringsmateriale #2 (missing)
- [X] T053 Tilføj et Mermaid-arkitekturdiagram i `README.md` (supplerer T045): browser og Tableau Desktop som klienter, backend med controllers → services → repositories, PostgreSQL med volume `pg_data`, Docker-netværket og portene 3000 (vært) og 5432 (kun internt) *(rettet 02/11: før MySQL/3306, research R11)* per plan: Afleveringsmateriale #1 (partial)
- [X] T054 Opret `specs/001-booking-kpi-bar/converge.md` med afsnittet "Converge #1 (30/10)": implementeret pr. user story og FR, åbne tasks, fund fra T046/T047/`/speckit-analyze` og bevidst accepterede afvigelser (U2, G1, T050 uden screenshots) per plan: Afleveringsmateriale #3 (missing)
- [ ] T055 Tilføj afsnittene "Converge #2" og "Sidste Converge-tjek" i `specs/001-booking-kpi-bar/converge.md`, når de tjek er kørt per plan: Afleveringsmateriale #3 (missing)
- [X] T056 Beskriv i `contracts/openapi.yaml` (parameteren `search` på `GET /api/bookings`), at en søgetekst over 100 tegn afkortes til 100 tegn, så kontrakten matcher `bookingService.list` per FR-010 / Constitution IV (partial)

---

## Phase 9: Databaseskift MySQL → PostgreSQL (tillægsopgave uge 2, FR-030, SC-009)

**Purpose**: Hotellet vil ikke have MySQL. Kun datalaget, `db-init/`, seed-scriptet og Docker
ændres (research R11, plan "Tillægsopgave uge 2"). Forretningslaget, controllers, kontrakten og
de 55 unit-tests ændres **ikke** i logik. Kun kommentarer og ét testnavn, der nævner MySQL, rettes (T064). MySQL-versionen ligger i tagget `uge1-mysql`.

**Independent Test**: Efter `docker compose down -v && docker compose up --build` giver quickstart
trin 2–6 præcis de samme tal som `uge1-mysql` (T066).

- [X] T057 [P] Omskriv `.env.example`: erstat `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER` og `MYSQL_PASSWORD` med `POSTGRES_DB=project_db`, `POSTGRES_USER=team_user` og `POSTGRES_PASSWORD=change-me`. Behold `PORT=3000` og advarslen om de gamle passwords. Kommentaren skal sige "PostgreSQL (bruges af db-containeren og backend)". Opdatér også din egen `.env` på samme måde (`.env` committes ikke, princip XII)
- [X] T058 Udskift `mysql2` med `pg` i `backend/package.json` (`"pg": "^8.13.0"`; npm skrev den installerede version `^8.23.1`), og opdatér `backend/package-lock.json` med `npm uninstall mysql2 && npm install pg@^8.13.0` i `backend/`. Uden Node lokalt køres det i en container: `MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W)/backend:/app" -w /app node:20-alpine sh -c "npm uninstall mysql2 && npm install pg@^8.13.0"`. Bagefter skal der stadig være præcis fire afhængigheder: `express`, `pg`, `swagger-ui-express` og `yaml` (princip I)
- [X] T059 Omskriv `backend/src/db.js`: `const { Pool, types } = require('pg')`. Poolen oprettes med `host: process.env.DB_HOST || 'localhost'`, `port: Number(process.env.DB_PORT || 5432)`, `user: process.env.POSTGRES_USER`, `password: process.env.POSTGRES_PASSWORD`, `database: process.env.POSTGRES_DB` og `max: 10` og `options: '-c timezone=Europe/Copenhagen'` (forbindelsens tidszone styrer `LOCALTIMESTAMP`, så `sold_at` bliver dansk tid uanset containerens opsætning, research R11). Tilføj `types.setTypeParser(1082, (value) => value)` (DATE) og `types.setTypeParser(1114, (value) => value)` (TIMESTAMP), så datoer returneres som tekst og ikke som JS-`Date` (research R8 + R11). Kommentaren øverst skal nævne PostgreSQL. Eksportér poolen
- [X] T060 [P] Omskriv `db-init/01-schema.sql` til PostgreSQL efter [data-model.md](data-model.md) og research R11. Øverst: kommentar (PostgreSQL, køres kun ved tom volumen, ingen gemte nøgletal) og `CREATE EXTENSION IF NOT EXISTS unaccent;`. Ingen `SET NAMES`, `ENGINE`, `CHARSET`, `COLLATE`, `UNSIGNED`, `AUTO_INCREMENT` eller `ENUM`. Alle constraints navngives som i MySQL-versionen (`uq_room_type_name`, `chk_room_type_prices`, `fk_booking_room_type`, `chk_booking_nights`, `chk_booking_arrival`, `uq_drink_name`, `fk_bar_sale_drink`, `chk_bar_sale_quantity`, indeksene `idx_booking_*`). De nye CHECKs, der erstatter `UNSIGNED` og `ENUM`, får navne efter samme mønster, fx `chk_booking_season` og `chk_drink_price`. Tabeller:
  - `room_type(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR(50) NOT NULL UNIQUE, price_low INTEGER NOT NULL, price_mid INTEGER NOT NULL, price_high INTEGER NOT NULL)` med `CHECK (price_low >= 0)` og `CHECK (price_low <= price_mid AND price_mid <= price_high)`
  - `booking(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, first_name VARCHAR(100) NOT NULL, last_name VARCHAR(100) NOT NULL, country VARCHAR(100) NOT NULL, room_type_id INTEGER NOT NULL REFERENCES room_type (id), nights SMALLINT NOT NULL, season TEXT NOT NULL, total_price INTEGER NOT NULL, is_historical BOOLEAN NOT NULL DEFAULT FALSE, arrival_date DATE NULL, created_at TIMESTAMP(0) NOT NULL DEFAULT LOCALTIMESTAMP(0))` med `CHECK (nights >= 1)`, `CHECK (season IN ('low','mid','high'))`, `CHECK (total_price >= 0)`, `CHECK ((is_historical = TRUE AND arrival_date IS NULL) OR (is_historical = FALSE AND arrival_date IS NOT NULL))` og `CREATE INDEX` på `last_name`, `first_name` og `arrival_date`
  - `drink(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, name VARCHAR(100) NOT NULL UNIQUE, category TEXT NOT NULL, price NUMERIC(8,2) NOT NULL, historical_units_sold INTEGER NOT NULL DEFAULT 0)` med `CHECK (category IN ('Coffee','Cocktail'))`, `CHECK (price >= 0)` og `CHECK (historical_units_sold >= 0)`
  - `bar_sale(id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, drink_id INTEGER NOT NULL REFERENCES drink (id), quantity SMALLINT NOT NULL, sold_at TIMESTAMP(0) NOT NULL DEFAULT LOCALTIMESTAMP(0))` med `CHECK (quantity >= 1)`. `(0)` = hele sekunder, så `sold_at` svarer til kontraktens format `'YYYY-MM-DD HH:MM:SS'` (uden `(0)` kommer der mikrosekunder med)
- [X] T061 Ret `scripts/generate-seed.js` til PostgreSQL (research R11): erstat `SET NAMES utf8mb4;` med `SET client_encoding = 'UTF8';`, lad escape-funktionen kun fordoble `'` (fjern fordoblingen af `\`), og skriv "PostgreSQL" i kommentaren øverst. `START TRANSACTION;` og `COMMIT;` beholdes. Kør `node scripts/generate-seed.js`, og commit `db-init/02-seed.sql`. Kontrollér med `git diff db-init/02-seed.sql`, at kun kommentaren og `SET`-linjen er ændret (de 1030 INSERT-rækker er de samme), og at der stadig er 54 × `Müller` og `91.40` for Cosmopolitan
- [X] T062 [P] Omskriv service `db` i `compose.yaml` (research R11, plan "Docker-design"): `image: postgres:16-alpine`, `restart: unless-stopped`, `env_file: .env`, `environment: TZ: Europe/Copenhagen, PGTZ: Europe/Copenhagen` (`TZ` bliver serverens standardtidszone ved første opstart, `PGTZ` gælder kun `psql` i containeren; backendens tidszone sættes i `db.js`, T059), volumes `pg_data:/var/lib/postgresql/data` og `./db-init:/docker-entrypoint-initdb.d:ro`, **ingen** `ports`. Healthcheck `["CMD-SHELL", "pg_isready -h 127.0.0.1 -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]` med `interval: 5s`, `timeout: 5s`, `retries: 20`, `start_period: 30s`. Kommentarerne skal forklare TCP-reglen (init-serveren lytter kun på socket, så `db` først bliver healthy efter seed). `backend` får `environment: DB_HOST: db` i stedet for `MYSQL_HOST`. Top-level `volumes: pg_data:` i stedet for `mysql_data:`. I `docker/docker-compose.yml` får `app` `DB_HOST: db` og `DB_PORT: "5432"` i stedet for `MYSQL_HOST`/`MYSQL_PORT`. *(tilføjet 02/11, analyze D1, konstitution V)* I `docker/Dockerfile` (dev-containeren) erstattes `default-mysql-client` med `postgresql-client`, og kommentaren ændres til "PostgreSQL client (psql)". Fjern også de forældede `mysql_data`-linjer i `.dockerignore` og `.gitignore` (`pg_data` er en named volume og skal ikke stå der)
- [X] T063 Omskriv `backend/src/repositories/bookingRepository.js` til `pg` (research R11):
  - `const { rows } = await pool.query(...)` i stedet for `const [rows]`, og `$1, $2, ...` i stedet for `?`. Kommentaren øverst nævner `$n`-pladsholdere
  - `toBooking(row)`: `is_historical: row.is_historical === true` (pg giver `true/false`, ikke `0/1`). **Uden denne rettelse kan historiske bookinger rettes og slettes (FR-003)**
  - `findAll(search)`: `WHERE unaccent(booking.first_name) ILIKE unaccent($1) OR unaccent(booking.last_name) ILIKE unaccent($1) OR unaccent(booking.first_name || ' ' || booking.last_name) ILIKE unaccent($1)` med én parameter `%search%`. Kommentaren nævner `unaccent` i stedet for kollationen
  - `create(...)`: `INSERT ... RETURNING id`, og returnér `rows[0].id`
  - `update` og `remove`: `$n`-pladsholdere, ellers uændrede
  - `findRevenueRows()` og `findDatedStays()`: kun `{ rows }`, ingen beregning (princip V)
- [X] T064 [P] Omskriv de øvrige repositories til `pg` med `{ rows }` og `$n`:
  - `backend/src/repositories/drinkRepository.js`: `findAll`, `findById` og `findAllWithRegisteredUnits` med `COALESCE(SUM(bar_sale.quantity), 0)::int AS registered_units` (`SUM` giver ellers `bigint` som tekst). `GROUP BY drink.id` er nok, fordi `id` er primærnøglen
  - `backend/src/repositories/barSaleRepository.js`: `create` med `INSERT ... RETURNING id`, `findById` uændret ud over `$1`
  - `backend/src/repositories/roomTypeRepository.js` og `backend/src/repositories/healthRepository.js`: `{ rows }` og `$1`
  - *(tilføjet 02/11, analyze C1/I1)* Kun ordlyd, ingen logik: ret "MySQL" til "databasen" i kommentarerne `backend/src/services/barCalculations.js:4` og `backend/src/services/barService.js:20` (pg giver også `NUMERIC` og `bigint` som tekst, så koden er stadig rigtig), og i `backend/tests/unit/barCalculations.test.js` i kommentaren på linje 13 og testnavnet på linje 36 (`"withUnitsSold: registered_units som streng fra databasen (SUM kan give tekst)"`). Testenes indhold og antal (55) ændres ikke
- [X] T065 [P] Opdatér dokumenter om databasen: `db-init/README.md` (PostgreSQL-imagets `/docker-entrypoint-initdb.d`, kører kun ved tom volumen, `02-seed.sql` genskabes med `node scripts/generate-seed.js`) og `specs/001-booking-kpi-bar/HANDOFF.md` "Praktiske noter" (`pg_data`, `psql`-kommandoen fra quickstart trin 2, `.env` med `POSTGRES_*`, og `docker volume rm hotel-kong-artur_mysql_data` til den gamle volumen)
- [X] T066 Validér databaseskiftet (SC-009, FR-030): `docker compose down -v`, `docker volume rm hotel-kong-artur_mysql_data` (hvis den findes) og `docker compose up --build`. Kør [quickstart.md](quickstart.md) trin 1–6, og sammenlign med uge 1: SQL-tjekket giver 1000/1000/1000, Cocktail 20/Coffee 10, 54 Müller og `SUM(total_price)` 11234034. `GET /api/bookings?search=muller` giver 54. `PUT /api/bookings/1` → 409 (boolean-rettelsen virker). `/api/kpi/revenue/by-room-type-season` giver 24 rækker med Σ 11234034. Baren giver 179958 / 13448640.34 og 52.83 / 47.17. Et nyt salg får `sold_at` i dansk tid og formatet `YYYY-MM-DD HH:MM:SS` uden decimaler (kontrakten). `npm test` giver 55/55. `grep -rni mysql backend/src backend/tests compose.yaml docker db-init scripts .env.example .dockerignore .gitignore` giver ingen træf. Fjern derefter `MYSQL_*`-linjerne i din egen `.env` (beholdt under skiftet, se T057). Skriv resultatet i `specs/001-booking-kpi-bar/converge.md` under "Converge #2"

**Checkpoint**: Samme system og samme tal som `uge1-mysql`, nu på PostgreSQL.

---

## Phase 10: Fælles frontend efter styleguiden (FR-031, FR-032, research R12)

**Purpose**: Ét fælles udseende, før de tre sider bygges, så T025, T035 og T043 kan laves
parallelt uden at hver side får sin egen stil. Læs `styleguide/style.md` og se skærmbillederne
i `styleguide/screenshots/`, før du går i gang (styleguide regel 1–2).

- [X] T067 Opret `backend/public/css/style.css` (den eneste CSS-fil, intet framework):
  - **Tokens** i `:root`, præcis som i research R12: `--color-primary: #AA6A11`, `--color-primary-strong: #8A560E`, `--color-secondary: #003523`, `--color-background: #F4EFEB`, `--color-band: #E5D8D1`, `--color-surface: #FFFFFF`, `--color-text: #4B4845`, `--color-text-muted: #6E6A67`, `--color-border: #D2CDCA`, `--color-input-border: #CED4DA`, `--color-error-bg: #DBD3C8`, `--color-warning: #7A4B0C`, `--color-error: #9B2C1F`, `--color-success: #003523`. Skrift: `--font-heading: "Times New Roman", Georgia, serif` og `--font-body: "Barlow", "Segoe UI", Arial, sans-serif`. Afstande: `--space-1` til `--space-6` (4, 8, 16, 24, 48, 96 px). `--content-width: 1290px`. HEX-værdier må kun stå i `:root`
  - **Base**: `body` i `--font-body`, 16 px, `line-height: 1.6`, `--color-text` på `--color-background`. `h1`–`h3` i `--font-heading`, vægt 400 (`h1: clamp(2rem, 4vw, 3rem)`, `h2: 2rem`, `h3: 1.5rem`), sideoverskrift `h1` i `--color-secondary`. Links i `--color-primary-strong`. `.container` (maks. `--content-width`, centreret, 16 px sidemargin på mobil)
  - **Header** `.site-header`: `--color-background`, 1 px kant forneden i `--color-border`, navnet centreret som `.brand` (`.brand__small` "Hotel" i kursiv `--font-heading`, `.brand__name` "KONG ARTHUR" i `--font-body` 600, store bogstaver, `letter-spacing: 0.15em`). Navigation `.nav` med `.nav__link` (versaler, `letter-spacing: 0.05em`) og `.nav__link--active` i `--color-primary` med streg under
  - **Knapper**: `.button` (firkantet, `min-height: 48px`, `--font-body` 600, 1.1875rem, så hvid tekst på `#AA6A11` er "stor tekst" efter WCAG), `.button--primary` (`--color-primary`, hvid tekst, `:hover` `--color-primary-strong`), `.button--secondary` (gennemsigtig, 1 px kant i `--color-text`), `.button--danger` (`--color-error`, hvid tekst), `:disabled` (opacity 0.5, `cursor: not-allowed`) og `:focus-visible` (2 px kontur i `--color-secondary`, offset 2 px) på alt interaktivt
  - **Formularer**: `.field` (label over feltet), `input`/`select` hvide, 1 px `--color-input-border`, `min-height: 48px`, firkantede. `.field--invalid input` får kant i `--color-warning`. `.field-error` er strimlen under feltet (`--color-error-bg`, tekst i `--color-warning`, 0.875rem)
  - **Beskeder**: `.alert` med `.alert--success` (venstre kant og tekst i `--color-success`), `.alert--error` (venstre kant og tekst i `--color-error`) og `.alert--info` (`--color-text-muted`, til "Henter ...")
  - **Nøgletal og kort**: `.card` (`--color-surface`, 1 px `--color-border`, `padding: var(--space-4)`, ingen skygge), `.kpi` med `.kpi__value` (`--font-heading`, 2.5rem, `--color-primary-strong`) og `.kpi__label` (`--color-text-muted`), `.kpi-grid` (CSS grid, `repeat(auto-fit, minmax(220px, 1fr))`), `.band` (sektion i `--color-band`)
  - **Tabeller**: `.table-wrap` (`overflow-x: auto`), `table` på `--color-surface`, `th` i versaler og `--color-text-muted`, rækker adskilt af 1 px `--color-border`, `.num` højrestillet med `font-variant-numeric: tabular-nums`
  - **Responsivt**: under 768 px én kolonne, navigationen brydes på flere linjer, ingen vandret scroll på `body` (FR-032, SC-010)
  - Ingen `border-radius` og ingen `box-shadow` nogen steder (skærmbillederne har ingen)
- [X] T068 [P] Opret `backend/public/js/api.js` (fælles for alle sider, ingen beregning af nøgletal, sæson eller pris, FR-029):
  - `async function apiGet(path)` og `async function apiSend(method, path, body)`: `fetch` med JSON. Ved 204 returneres `null`. Ved fejlstatus kastes `ApiError` med `status`, `message` (`error` fra svaret) og `fields` (array, tomt hvis det mangler). Netværksfejl → `ApiError` med status 0 og beskeden "API'et svarer ikke"
  - `showAlert(element, type, text)` (type `success`/`error`/`info`, sætter `.alert--{type}` og `role="status"` eller `role="alert"`) og `clearAlert(element)`
  - `markFieldErrors(form, fields)`: tilføj `.field--invalid` og en `.field-error` med "Ugyldig eller mangler" under hvert felt med samme `name`. `clearFieldErrors(form)`
  - Kun visningsformat, ingen beregning: `formatDkk(value)` med `Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK' })`, `formatNumber(value)` og `formatPercent(value)` (tallet fra API'et + " %")
  - Filen indlæses med `<script src="js/api.js"></script>` før sidens egen fil (ingen moduler og intet build-step, princip I)
- [X] T069 Omskriv `backend/public/index.html` til forsiden og skabelonen for de andre sider: `<html lang="da">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, Google Fonts-`<link>` til Barlow (400, 500, 600, 700) med `display=swap` *(700 tilføjet 02/11: knapperne bruger fed 19 px, så hvid på `--color-primary` er "stor tekst" efter WCAG, se T067)*, `css/style.css`, `.site-header` med `.brand` og `.nav` (Bookinger → `bookings.html`, Overblik → `overview.html`, Bar → `bar.html`, Swagger UI → `/api-docs`), en `h1` ("Hotel Kong Arthur – personalets værktøjer") og tre `.card` med links og en linje om hver side. Ingen fotos og intet logo (research R12). T025, T035 og T043 kopierer `<head>` og `.site-header` herfra og sætter `.nav__link--active` på deres egen side

**Checkpoint**: Fælles stil, header og `api.js` findes. T025, T035 og T043 kan laves parallelt.

---

## Phase 11: Verificering af tillægsopgaven (SC-008, SC-009, SC-010)

- [X] T070 *(ændret 03/11, research R7)* Kontrollér SC-007, SC-008 og FR-028: lav en tabel i `specs/001-booking-kpi-bar/converge.md` under "Converge #2" med én række pr. af casens nøgletal i Tableau-dashboardet (T048), aflæst **uden filter** (alle filtre *(All)*). Filterkombinationer på tværs af ark (fx land × sæson) har intet endpoint og sammenlignes ikke (konstitution 5.1.0). Kolonner: Tableau-beregning (fx `SUM(total_price)` pr. `country` på `/api/bookings`) → KPI-endpoint → element i frontenden (`overview.html` eller `bar.html`) → værdi med startdata i Tableau, i endpointet og i frontenden. 10 rækker: (1) årets indtjening (`/api/kpi/revenue/total`), (2) gæster pr. land (`by-country`, `booking_count`), (3) indtjening pr. land (`by-country`), (4) pr. værelsestype (`by-room-type`), (5) pr. sæson (`by-season`), (6) værelsestype pr. sæson (værelsestype-arket med kun `season` valgt ↔ `by-room-type-season` ↔ sæson-dropdownen i `overview.html`, tilføjet 03/11, analyze H1. Den eneste filtrerede række, fordi FR-017 kræver den som nøgletal), (7) barens omsætning (`/api/bar/kpi/total`), (8) omsætning pr. drink (`revenue-by-drink`), (9) kategorifordeling (`category-split`) og (10) eget nøgletal (arket "Mest solgte" på `revenue-by-drink` ↔ `/api/kpi/top-drinks` ↔ `overview.html`). De tre værdier skal være ens i hver række. Fordi Tableau summerer selv, er tabellen beviset for, at de to beregninger giver samme tal
  - ~~Oprindelig tekst: én række pr. endpoint for alle 11 KPI-endpoints (`/api/kpi/revenue/total`, `by-country`, `by-room-type`, `by-season`, `by-room-type-season`, `/api/kpi/occupancy`, `/api/kpi/occupancy/nights`, `/api/kpi/top-drinks`, `/api/bar/kpi/total`, `revenue-by-drink`, `category-split`), med samme værdi i Swagger UI, frontenden og Tableau~~
- [ ] T071 *(udvidet 02/11, analyze U1)* Kør [quickstart.md](quickstart.md) trin 9 (frontend) i browseren. Kontrollér desuden SC-010, FR-031 og FR-032 på alle fire sider i `backend/public/` (`index.html`, `bookings.html`, `overview.html`, `bar.html`):
  - `grep -nE "#[0-9A-Fa-f]{3,6}" backend/public/css/style.css` finder kun linjer i `:root`, og `grep -rn 'style="' backend/public` finder intet
  - Ved 375 px bredde i browserens udviklerværktøj er der ingen vandret scroll (tabeller scroller i deres egen boks)
  - Med Tab-tasten kan man nå alle knapper og felter, og fokus er synligt
  - Kontrasten følger research R12 (stikprøve med udviklerværktøjets kontrastmåler på knapper, labels og fejlstrimlen)
  - Gennemgå siderne mod styleguidens afsnit 11 (regel 1–10) og skærmbillederne. Skriv afvigelser og begrundelser i `specs/001-booking-kpi-bar/converge.md`
- [ ] T072 Kør `/speckit-analyze` og `/speckit-converge`, og opdatér `specs/001-booking-kpi-bar/HANDOFF.md` (status og næste skridt) og `specs/001-booking-kpi-bar/converge.md` "Converge #2" med resultatet af T066, T070 og T071 (afslutter den del af T055, der gælder Converge #2)

---

## Phase 12: Ændringer fra gruppen (02/11, FR-033, FR-034)

**Purpose**: To ønsker efter T043: land som dropdown på bookingsiden, og registrerede barsalg
skal kunne slettes. Kontrakten er opdateret til 2.2.0 i samme commit som koden (princip IV).

- [X] T073 [US1] Land som dropdown i `backend/public/bookings.html` og `backend/public/js/bookings.js` (FR-033): `<select name="country">` med "Vælg land" og de 21 lande i alfabetisk rækkefølge (Australia, Brazil, Canada, China, Denmark, Egypt, France, Germany, India, Italy, Japan, Mexico, Nigeria, Pakistan, Russia, South Korea, Spain, Sweden, United Kingdom, United States, Vietnam), værdien = datafilens stavemåde. Ved "Ret" på en booking med et land uden for listen tilføjes landet som ekstra valg (edge case), og det fjernes igen, når formularen nulstilles. API'et ændres ikke (land er stadig tekst, FR-004)
- [X] T074 [US3] Backend for registrerede barsalg (FR-034, kontrakt 2.2.0):
  - `backend/src/repositories/barSaleRepository.js`: `findAll()` (`bar_sale` JOIN `drink`: `id, drink_id, name, category, quantity, sold_at`, `ORDER BY bar_sale.id DESC`) og `remove(id)` (returnerer, om en række blev slettet, via `rowCount`)
  - `backend/src/services/barService.js`: `listSales()` og `deleteSale(id)`: id skal være et positivt heltal ellers `ValidationError(['id'])`, ukendt id → `NotFoundError('Barsalg {id} findes ikke')`
  - `backend/src/controllers/barController.js` og `backend/src/routes.js`: `GET /api/bar/sales` → 200 array og `DELETE /api/bar/sales/:id` → 204 uden body
  - Opdatér [quickstart.md](quickstart.md) trin 6 med de to nye kald
- [X] T075 [US3] "Registrerede salg" på `backend/public/bar.html` og `backend/public/js/bar.js` (FR-034, US3 scenarie 8): tabel med tidspunkt, drikkevare, kategori, antal og en `.button--danger`-knap "Slet" pr. salg (nyeste først, fra `GET /api/bar/sales`). Sletning kræver `confirm()`, kalder `DELETE /api/bar/sales/{id}`, viser `.alert--success` og henter salgslisten og barens nøgletal igen fra API'et. Uden salg: "Ingen registrerede salg endnu. Historiske salg fra datafilen kan ikke slettes." Listen opdateres også efter et nyt salg
