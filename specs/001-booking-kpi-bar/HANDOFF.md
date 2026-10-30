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

**Mandag – Tableau-forbindelse** til alle KPI-endpoints (quickstart trin 7). Indtil videre er kun
`/api/bookings` testet i Tableau (29/10).

**Tirsdag**: T048 dashboard og T055 Converge #2. **Onsdag**: T045 + T053 README, T052,
T049 og det sidste Converge-tjek (T055).

## Praktiske noter

- Backenden kører i Docker. Efter kodeændringer, også i `backend/public/`:
  `docker compose up -d --build backend` og Ctrl + F5 i browseren (filerne er bagt ind i imaget).
- Startdata: `docker compose down -v && docker compose up -d`. Barsalg kan ikke slettes via
  API'et, så det er eneste vej tilbage efter testsalg. `-v` sletter også oprettede bookinger.
- Lokalt findes ingen `node_modules`. Unit-tests kører alligevel (`cd backend && npm test`).
  Kode, der kræver `express`/`yaml`, køres i containeren:
  `MSYS_NO_PATHCONV=1 docker compose exec -T -w /app backend node -` (Git Bash på Windows
  omskriver ellers `/app`).
- Pipe ikke et script, der opretter testdata, gennem `head`. Det afbryder scriptet, før det
  sletter sine testbookinger.
- `sold_at` er dansk tid (databasen kører CET). Beløb regnes i øre i `barCalculations.js`.
- Tableau: REST API Connector, JSONPath `$` for objekter og `$[*]` for arrays (research R7).
- Projektets dokumenter og kommentarer er på dansk; kode-identifikatorer på engelsk.
- Brugeren vil have en begrundelse pr. ændring og stop til review efter hvert trin.
- Arbejd på en ny branch fra `main`, fx `uge2-frontend-booking`, og merge via PR med review.
