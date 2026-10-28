# Implementation Plan: Bookinger, nøgletal og barsalg

**Branch**: `001-booking-kpi-bar` | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-booking-kpi-bar/spec.md`

## Summary

Hotel Kong Arthur får et REST API til bookinger (opret, søg, ret, afbestil), nøgletal for
omsætning og belægning og registrering af barsalg. Backenden er Node.js 20 + Express i tre lag
(controllers → services → repositories) mod MySQL 8.0. Sæson, pris og alle nøgletal beregnes i
forretningslaget ved hvert kald. Databasen seedes én gang fra ITAKEA/hoteldata (1000 historiske
bookinger og 30 drinks) via `db-init/*.sql`. API'et beskrives i
[contracts/openapi.yaml](contracts/openapi.yaml) og serveres i Swagger UI. Tableau Public
henter færdigberegnede nøgletal via CSV-eksport-endpoints i samme API (research R7). `docker compose up` starter
`db` og `backend`. Dev-containeren ligger bag profilen `dev`. Frontenden (ren HTML/CSS/JS i
`backend/public`) bygges i uge 2.

## Technical Context

**Language/Version**: JavaScript (CommonJS) på Node.js 20 LTS

**Primary Dependencies**: `express` (HTTP/routing), `mysql2` (MySQL-driver, `mysql2/promise`,
rå SQL), `swagger-ui-express` (Swagger UI på `/api-docs`), `yaml` (indlæser
`openapi.yaml`). Ingen dev-dependencies: tests bruger `node:test` og `node:assert`.

**Storage**: MySQL 8.0 (`mysql:8.0`-image), `utf8mb4`, named volume `mysql_data`, init fra
`db-init/01-schema.sql` + `02-seed.sql`

**Testing**: `node --test` (unit-tests af rene funktioner i services, uden database).
End-to-end manuelt via [quickstart.md](quickstart.md) og Swagger UI.

**Target Platform**: Docker (Linux-containere) på gruppens Windows/macOS-maskiner. Browser og
Tableau Public på værten.

**Project Type**: Web-service (REST API) med statisk frontend serveret af samme Express-app

**Performance Goals**: Ingen særlige. ~1000–2000 bookinger og 30 drinks. Nøgletal beregnes
i hukommelsen pr. kald på < 100 ms. SC-001/SC-003 handler om brugerens tid, ikke serverens.

**Constraints**: Kun de fire biblioteker ovenfor (princip I). SQL kun i `repositories/`
(princip II). Ingen gemte nøgletal (princip V). Passwords kun i `.env` (princip XII). Ét
`docker compose up` (princip IX).

**Scale/Scope**: 3 brugerroller uden login, 4 tabeller, 25 endpoints (inkl. 8 KPI-CSV-eksporter
og health), 1 hotel med 214 værelser

Ingen `NEEDS CLARIFICATION` tilbage. Åbne valg er afgjort i [research.md](research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Princip | Status | Hvordan planen overholder det |
|---|---------|--------|-------------------------------|
| I | Simpelt frem for smart | ✅ | 4 runtime-biblioteker, hver med begrundelse (tabel nedenfor). Ingen ORM, intet dato-/xlsx-/CSV-/test-bibliotek |
| II | 3-lagsarkitektur | ✅ | `controllers/` → `services/` → `repositories/`. SQL kun i repositories. Controllers kun HTTP ↔ service |
| III | REST + JSON | ⚠️ begrundet | GET/POST/PUT/DELETE med 200/201/204/400/404. **Afvigelser**: 409 (historisk booking), 500 (uventet fejl), 503 (health) og `text/csv` (eksport). Se Complexity Tracking |
| IV | OpenAPI + Swagger | ✅ | Kontrakten skrives først i `contracts/openapi.yaml` og serveres direkte af backend. Tableau bruger API'et (CSV-endpoints), ingen DB-genvej. DB-porten udstilles ikke |
| V | Databasen er sandheden | ✅ | Seed kun ved første opstart. Ingen nøgletalskolonner. Alle KPI'er beregnes pr. kald |
| VI | Ankomstdato + nætter | ✅ | Ny booking kræver `arrival_date` + `nights ≥ 1`. Sæson/pris kan ikke indtastes. Historiske uden datoer (DB-CHECK), PUT/DELETE → 409 |
| VII | Kapacitet 214 | ✅ | Belægning = bookede værelser pr. nat ÷ 214, kun bookinger med dato, beregnet i `kpiCalculations.js`. Intet kapacitetstjek ved oprettelse: 214 er hotellets samlede kapacitet uden fordeling pr. værelsestype og bruges kun til belægningsgraden (research R9). Hver booking tæller som ét værelse (FR-013) |
| VIII | Barsalg ét ad gangen | ✅ | `bar_sale(drink_id, quantity, sold_at)`, ingen medarbejderfelt, menu på 30 fra seed |
| IX | Docker | ✅ | `docker compose up` starter `db` + `backend`. `depends_on: service_healthy` med TCP-ping. Named volume |
| X | Spec først | ✅ | Denne plan → `/speckit-tasks` → kode |
| XI | Vi ejer koden | ✅ | Proces. Planen holder koden lille og uden "magi", så den kan forklares |
| XII | Sikkerhed + tests | ✅ | `.env` (ignoreret) + `.env.example`. Gamle passwords fjernes fra compose. Unit-tests af sæson, pris og KPI'er |

**Begrundelse for biblioteker (princip I)**:

| Bibliotek | User story | Hvorfor det simpleste alternativ ikke er nok |
|-----------|-----------|-----------------------------------------------|
| `express` | US1–3 (REST API) | Routing, JSON-body og statiske filer med `node:http` alene giver meget mere egen kode |
| `mysql2` | US1–3 (data i MySQL) | Node har ingen indbygget MySQL-klient |
| `swagger-ui-express` | US1-7, FR-015 | Swagger UI er et krav (princip IV). Pakken serverer den fra vores egen YAML |
| `yaml` | FR-015 | Kontrakten er YAML, og Node kan ikke parse YAML. Alternativet (vedligeholde JSON i hånden) giver to kopier |

**Gate-resultat (før Phase 0)**: PASS med begrundede afvigelser fra III.
**Gate-resultat (efter Phase 1)**: PASS. Datamodel, kontrakt og quickstart holder sig inden
for principperne. Ingen nye afhængigheder er kommet til under design.

## Project Structure

### Documentation (this feature)

```text
specs/001-booking-kpi-bar/
├── plan.md              # Denne fil
├── research.md          # Phase 0: beslutninger (data, Docker, Tableau, regler)
├── data-model.md        # Phase 1: tabeller, regler, afledte værdier
├── quickstart.md        # Phase 1: end-to-end-validering med forventede tal
├── contracts/
│   └── openapi.yaml     # Phase 1: API-kontrakten (serveres i Swagger UI)
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, ikke lavet endnu)
```

### Source Code (repository root)

```text
compose.yaml                  # db + backend, include: docker/docker-compose.yml
.env.example                  # pladsholdere. .env er i .gitignore
docker/
├── docker-compose.yml        # kun dev-containeren app, profiles: [dev]
└── Dockerfile                # dev-container (uændret)
db-init/
├── README.md
├── 01-schema.sql             # room_type, booking, drink, bar_sale
└── 02-seed.sql               # GENERERET af scripts/generate-seed.js. Committes
scripts/
├── generate-seed.js          # engangsscript, ingen afhængigheder (research R3)
└── source/                               # committes, så seed kan genskabes
    ├── international_names_with_rooms_1000.csv   # samme indhold som kilden (linjeskift normaliseret til LF)
    └── drinks_menu_with_sales.csv          # skrevet fra xlsx-celler, komma + decimalpunktum
backend/
├── Dockerfile                # node:20-alpine, build-context = repo-roden
├── package.json              # scripts: start, test
├── package-lock.json
├── public/                   # uge 2: index.html, bookings, overblik, bar (HTML/CSS/JS)
├── src/
│   ├── server.js             # starter app på PORT (3000)
│   ├── app.js                # express, json, static, /api-docs, routes, fejl-middleware
│   ├── db.js                 # mysql2/promise pool (dateStrings: true) fra env
│   ├── routes.js             # URL → controller-funktion
│   ├── controllers/
│   │   ├── bookingController.js
│   │   ├── kpiController.js
│   │   ├── barController.js
│   │   ├── exportController.js   # sætter text/csv og kalder services
│   │   └── healthController.js
│   ├── services/
│   │   ├── bookingService.js     # validering, sæson/pris, 404/409-regler
│   │   ├── bookingRules.js       # rene funktioner: season, price, validateBooking, isValidDate
│   │   ├── kpiService.js         # henter rækker → kpiCalculations
│   │   ├── kpiCalculations.js    # rene funktioner: revenue, groupBy, occupancy, topDrinks
│   │   ├── barService.js
│   │   ├── barCalculations.js    # rene funktioner: units, revenue (øre), categorySplit
│   │   ├── exportService.js      # bygger CSV-rækker ud fra de andre services
│   │   ├── csv.js                # ren funktion: rækker → CSV-tekst (escaping)
│   │   ├── healthService.js      # kalder healthRepository.ping → ok/error
│   │   └── errors.js             # ValidationError(fields), NotFoundError, ConflictError
│   └── repositories/
│       ├── bookingRepository.js
│       ├── roomTypeRepository.js
│       ├── drinkRepository.js
│       ├── barSaleRepository.js
│       └── healthRepository.js   # SELECT 1
└── tests/
    └── unit/
        ├── bookingRules.test.js
        ├── kpiCalculations.test.js
        ├── barCalculations.test.js
        └── csv.test.js
```

**Structure Decision**: Én web-service i `backend/` med frontend i `backend/public` (ingen
separat frontend-projekt eller build-step). Lagene svarer 1:1 til mapperne `controllers/`,
`services/` og `repositories/`. Fejlklasser i `services/errors.js` oversættes til
400/404/409 i én fejl-middleware i `app.js`, så controllers ikke indeholder statuslogik for
fejl.

`bookingRules.js`, `kpiCalculations.js`, `barCalculations.js` og `csv.js` ligger i `services/`
og **er** forretningslaget. Det er rene funktioner (data ind, resultat ud) uden SQL og HTTP. De
`*Service.js`-filer i samme mappe henter rækker fra repositories og kalder de rene funktioner.
Der er stadig præcis tre lag. Opdelingen gør, at sæson, pris og nøgletal kan unit-testes uden
database (princip XII). `exportService.js` kalder `kpiService`/`barService` og formaterer kun
resultatet som CSV, så Tableau-tallene ikke beregnes et andet sted (research R7).

Backend-imaget bygges med repo-roden som context, så
`specs/001-booking-kpi-bar/contracts/openapi.yaml` kan kopieres ind som den eneste kopi af
kontrakten (stien gives via `OPENAPI_PATH`).

### Docker-design (detaljer i research R4–R6)

| Service | Fil | Nøglepunkter |
|---------|-----|--------------|
| `db` | `compose.yaml` | `mysql:8.0`, `env_file: .env`, `TZ=Europe/Copenhagen`, healthcheck `mysqladmin ping -h 127.0.0.1` med login fra miljøet, volume `mysql_data:/var/lib/mysql`, `./db-init:/docker-entrypoint-initdb.d:ro`, ingen port på værten |
| `backend` | `compose.yaml` | build `context: .`, `dockerfile: backend/Dockerfile`, `env_file: .env` + `MYSQL_HOST=db`, `ports: "3000:3000"`, `depends_on: db: condition: service_healthy`, healthcheck mod `/api/health` med `node -e fetch(...)` |
| `app` | `docker/docker-compose.yml` | `profiles: [dev]`, `env_file: ../.env`, `MYSQL_HOST=db`, ingen `depends_on` (kan ikke pege ud af en included fil) |

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| III: statuskode **409** ud over 200/201/204/400/404 | PUT/DELETE på historisk booking skal afvises (FR-003). Bookingen findes og input er gyldigt, så hverken 400 eller 404 er korrekt | 400 ville sige "dit input er forkert", selvom det er ressourcen, der er låst. Receptionisten og Swagger-brugeren kunne ikke skelne fejlene |
| III: statuskode **500** ved uventede fejl | Fejl-middlewaren skal svare på fejl, der ikke er brugerens skyld (fx kodefejl eller tabt DB-forbindelse midt i et kald). Svaret er stadig JSON: `{"error": "Intern fejl"}` | 400 eller 404 ville fejlagtigt give brugeren skylden. Express' standardsvar er HTML og bryder kravet om JSON-fejl |
| III: statuskode **503** på `/api/health` | Docker-healthcheck og drift skal kunne se, at DB er nede | 200 med `"status":"error"` ville få Docker til at melde backend sund |
| III: **`text/csv`** på `/api/export/*.csv` | Tableau Public kan ikke læse fra MySQL, og dens Web Data Connector er markeret som udfaset (afprøvet 28/10, research R7). CSV-tekstfil er den simpleste stabile vej via API'et (FR-021, FR-027, princip IV). OData er en mulig forbedring i uge 2 | JSON-endpoints: Tableau Public læser ikke JSON fra en URL og kræver fil-download alligevel. WDC: udfaset. CSV er fladere og enklere i Tableau. CSV'erne indeholder færdigberegnede nøgletal (ikke rå rækker), så Tableau ikke beregner noget selv. Fejl fra eksport-endpoints er stadig JSON |
| `scripts/generate-seed.js` (kode uden for backend) | 1030 INSERT-rækker skal laves korrekt én gang, med Müller-rettelsen (research R2, R3) | Håndskrevet SQL giver tastefejl. `LOAD DATA` kræver ekstra MySQL-opsætning og retter ikke tegnfejlen |
