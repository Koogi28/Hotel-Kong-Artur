# Overdragelse – 001-booking-kpi-bar (opdateret 03/11/2026 efter Converge #2, T072)

Log til den næste AI eller det næste gruppemedlem, der tager over. Læs i denne rækkefølge:

1. Denne fil
2. [converge.md](converge.md): hvad er implementeret, hvad mangler, og hvilke fund er bevidst
   accepteret
3. [tasks.md](tasks.md), [quickstart.md](quickstart.md) og `.specify/memory/constitution.md`
   (version 5.1.0)

## Status

**71/71 tasks færdige (100 %).** Backend, frontend (`backend/public/`) og Tableau-dashboardet
(`HotelKongArthurDashboard.twbx` i repo-roden) er færdige. Databasen er PostgreSQL 16.
55/55 unit-tests er grønne, og hele quickstart er kørt fra tom volumen 03/11 (T049, trin 1–9
bestået, ny booking 1 min og barsalg 10 sek). Converge #2: `/speckit-analyze` gav 0 CRITICAL og 0 HIGH, og `/speckit-converge` gav
"converged" uden nye tasks.

| Phase | Færdig | Mangler |
|-------|--------|---------|
| 1–5 (setup, foundational, US1–US3), 7, 9 (PostgreSQL), 10 (fælles frontend), 12 (gruppens ønsker) | alle | – |
| 6 Polish | 5/5 | – |
| 8 Convergence | 5/5 | – (T055: "Sidste Converge-tjek" i converge.md) |
| 11 Verificering | 3/3 | – (T070 SC-008, T071 styleguide, T072 Converge #2) |

**Vigtige beslutninger siden Converge #1** (detaljer i converge.md, "Ændringer siden spec'en"):

- MySQL → PostgreSQL (konstitution 5.0.0, research R11). Uge 1 ligger i tagget `uge1-mysql`.
- Tableau summerer rå rækker fra `/api/bookings` og `bar/kpi/revenue-by-drink`, og læser
  `bar/kpi/category-split`. Filtre på tværs af ark er tilladt (konstitution 5.1.0, princip IV,
  research R7). SC-008 er tjekket for alle 10 af casens nøgletal (T070).
- Land er en dropdown med 21 lande (FR-033), og registrerede barsalg kan slettes (FR-034,
  kontrakt 2.2.0).

## Næste skridt

Featurens specificerede omfang er færdigt. Tilbage er:

1. Merge `uge2-tableau-dashboard` til `main` via PR med review.
2. Præsentationen: brug converge.md, "Sidste Converge-tjek", som afleveret resultat.

## Praktiske noter

- **Databasen er PostgreSQL 16 fra uge 2** (research R11). MySQL-versionen ligger i Git-tagget
  `uge1-mysql`. Efter pull skal hver enkelt:
  1. Tilføje `POSTGRES_DB`, `POSTGRES_USER` og `POSTGRES_PASSWORD` i sin egen `.env` (se
     `.env.example`; `.env` committes ikke). `MYSQL_*` kan slettes (T066 er bestået).
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
- Tableau: REST API Connector, JSONPath `$[*]` for de tre datakilder (research R7). Workbooken
  er gemt med `season` = high, så sæt filteret til *(All)* for årets tal (quickstart trin 7).
- Projektets dokumenter og kommentarer er på dansk; kode-identifikatorer på engelsk.
- Brugeren vil have en begrundelse pr. ændring og stop til review efter hvert trin.
- Arbejd på en ny branch fra `main`, fx `uge2-tableau-dashboard`, og merge via PR med review.
  Commit aldrig på en branch, der allerede er merget.
