# Overdragelse – 001-booking-kpi-bar (opdateret 30/10/2026 efter Converge #1)

Log til den næste AI eller det næste gruppemedlem, der tager over. Læs i denne rækkefølge:

1. Denne fil
2. [converge.md](converge.md): hvad er implementeret, hvad mangler, og hvilke fund er bevidst
   accepteret
3. [tasks.md](tasks.md), [quickstart.md](quickstart.md) og `.specify/memory/constitution.md`

## Status

**44/53 tasks færdige (83 %).** Backenden er færdig: alle 19 endpoints er testet, og 55/55
unit-tests er grønne. Converge #1 er lavet (`/speckit-analyze`: 0 CRITICAL, 0 HIGH).

| Phase | Færdig | Mangler |
|-------|--------|---------|
| 1 Setup, 2 Foundational, 7 Convergence | alle | – |
| 3 US1 Bookinger | 6/7 | T025 booking-side |
| 4 US2 Nøgletal | 7/8 | T035 oversigt med sæson-dropdown |
| 5 US3 Barsalg | 6/7 | T043 barens side |
| 6 Polish | 2/5 | T045 README, T048 Tableau-dashboard, T049 fuld quickstart |
| 8 Convergence | 2/5 | T052 CONTRIBUTE.md, T053 Mermaid-diagram i README, T055 Converge #2 og sidste tjek |

## Næste skridt (uge 2)

**Mandag – frontend**, i denne rækkefølge, hver for sig med `/speckit-implement`:

1. **T025** booking-side (`bookings.html`, `js/bookings.js`, `css/style.css`). Vigtigst til demoen,
   fordi casen kræver opret, ret og slet fra browseren (FR-014).
2. **T035** oversigt (`overview.html`) med sæson-dropdown, der kun filtrerer rækkerne fra
   `by-room-type-season` i browseren.
3. **T043** barens side (`bar.html`).

Regler for alle tre: kun `fetch` mod API'et, ingen frameworks, ingen nye afhængigheder
(princip I) og ingen beregning af sæson, pris eller nøgletal i browseren (princip II). Sæson og
pris vises fra API'ets svar.

**Mandag – Tableau-forbindelse** til alle KPI-endpoints (quickstart trin 7). Testet indtil
videre: `/api/bookings` (29/10) samt `by-room-type-season` med sæsonfilter og `category-split`
(30/10, tallene stemmer med Swagger UI).

**Tirsdag**: T048 dashboard og T055 Converge #2. **Onsdag**: T045 + T053 README, T052,
T049 og det sidste Converge-tjek (T055).

## Praktiske noter

- **Databasen er PostgreSQL 16 fra uge 2** (research R11). MySQL-versionen ligger i Git-tagget
  `uge1-mysql`. Efter pull skal hver enkelt:
  1. Tilføje `POSTGRES_DB`, `POSTGRES_USER` og `POSTGRES_PASSWORD` i sin egen `.env` (se
     `.env.example`; `.env` committes ikke). `MYSQL_*` kan slettes, når T066 er bestået.
  2. Starte på en tom volumen: `docker compose down -v && docker compose up --build`. Data ligger
     nu i volumen `pg_data`. Den gamle MySQL-volumen kan slettes med
     `docker volume rm hotel-kong-artur_mysql_data` (hvis den findes).
- Databasen åbnes med
  `docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'` (quickstart trin 2).
- Backenden kører i Docker. Efter kodeændringer, også i `backend/public/`:
  `docker compose up -d --build backend` og Ctrl + F5 i browseren (filerne er bagt ind i imaget).
- Startdata: `docker compose down -v && docker compose up -d`. Enkelte registrerede barsalg
  kan slettes på barens side eller med `DELETE /api/bar/sales/{id}` (FR-034). `-v` sletter også oprettede bookinger.
- Lokalt findes ingen `node_modules`. Unit-tests kører alligevel (`cd backend && npm test`).
  Kode, der kræver `express`/`yaml`, køres i containeren:
  `MSYS_NO_PATHCONV=1 docker compose exec -T -w /app backend node -` (Git Bash på Windows
  omskriver ellers `/app`).
- Pipe ikke et script, der opretter testdata, gennem `head`. Det afbryder scriptet, før det
  sletter sine testbookinger.
- `sold_at` er dansk tid i hele sekunder: `backend/src/db.js` sætter forbindelsens tidszone til
  `Europe/Copenhagen`, og kolonnen er `TIMESTAMP(0)` (research R11). Beløb regnes i øre i
  `barCalculations.js`.
- Tableau: REST API Connector, JSONPath `$` for objekter og `$[*]` for arrays (research R7).
- Projektets dokumenter og kommentarer er på dansk; kode-identifikatorer på engelsk.
- Brugeren vil have en begrundelse pr. ændring og stop til review efter hvert trin.
- Arbejd på en ny branch fra `main`, fx `uge2-frontend-booking`, og merge via PR med review.
