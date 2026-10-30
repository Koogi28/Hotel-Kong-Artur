# Overdragelse – 001-booking-kpi-bar (30/10/2026)

Log til den næste AI eller det næste gruppemedlem, der tager over. Læs denne fil først, derefter
[tasks.md](tasks.md), [quickstart.md](quickstart.md) og `.specify/memory/constitution.md`.

## Status

**33/48 tasks færdige (69 %).** Backend til US1 og US2 er færdig. Næste skridt er Phase 5 (barsalg).

| Phase | Færdig | Mangler |
|-------|--------|---------|
| 1 Setup | 14/14 | – |
| 2 Foundational | 5/5 | – |
| 3 US1 Bookinger | 6/7 | T025 frontend (uge 2) |
| 4 US2 Nøgletal | 7/8 | T035 frontend (uge 2) |
| 5 US3 Barsalg | 0/7 | T037–T041, T043, T044 (`GET /api/bar/drinks` fra T041 virker allerede) |
| 6 Polish | 0/5 | T045–T049, bl.a. Tableau-dashboardet (T048) |
| 7 Convergence | 1/2 | T050 screenshots fra Swagger UI |

## Hvad der blev lavet i denne session

1. **`GET /api/bar/drinks`** (del af T041): `barService.listDrinks()` + `barController`.
   `price` omregnes fra DECIMAL-streng (`"91.40"`) til number, fordi kontrakten siger number
   (og Tableau ellers læser feltet som tekst). Resten af T041 mangler, så T041 står åben.
2. **Phase 4 (US2) backend**: T027, T029, T031–T034, T036.
   - `services/kpiCalculations.js`: rene funktioner (`totalRevenue`, `revenueBy`,
     `revenueByRoomTypeSeason`, `occupancyForDate`, `occupancyPerNight`, `topDrinks`) og
     konstanterne `CAPACITY = 214`, `SEASONS`.
   - `services/kpiService.js`, `controllers/kpiController.js`, 8 routes under `/api/kpi/*`.
   - `bookingRepository.findRevenueRows()` og `findDatedStays()` (ingen SUM/GROUP BY i SQL).
3. **FR-017 udvidet** (casen kræver indtjening "pr værelsestype (pr sæson)"):
   - Nyt endpoint `GET /api/kpi/revenue/by-room-type-season`: 24 rækker (8 × 3, også 0).
   - Kontrakt hævet til **2.1.0**. Opdateret: spec.md (FR-017 + US2 scenarie 7), plan.md
     (19 endpoints), data-model.md, tasks.md (T027, T029, T032, T033, T035, T036, T048),
     quickstart trin 5 og 7, research R7.
   - `/speckit-analyze` kørt to gange. Rettet: C1, C2, I1, I2, I3, A1, U1, I4.
     **Bevidst ikke rettet**: U2 (afvigende sortering er dokumenteret i kontrakten) og
     G1 (kontrakt og kode i samme commit – opfyldt af denne commit).
     Åbne LOW-fund: U3 (scenarie 7 mangler aktør), U4 (US2-intro nævner ikke kombinationen),
     C3 (quickstart tester ikke dropdown – kommer med T035).

## Verificeret

- `npm test` i `backend/`: **42/42** grønne.
- Mod den genbyggede container: alle tal i quickstart trin 5 passer (total 11234034 / 1000,
  20/8/3/24 rækker med Σ 11234034, belægning 0 → 0.5 % efter ny booking, Espresso 14656,
  Whiskey Sour 3824). "Live" afprøvet: opret booking → tal ændres → slet → tilbage.
- Alle 8 `/api/kpi/*`-svar matcher kontraktens påkrævede felter og typer, ingen nestede objekter.
- Databasen er efterladt på startdata (testbookinger slettet).

## Praktiske noter

- Backenden kører i Docker. Efter kodeændringer: `docker compose up -d --build backend`
  (koden og `openapi.yaml` er bagt ind i imaget, ingen live-reload).
- Lokalt findes ingen `node_modules`. Unit-tests kører alligevel (`cd backend && npm test`),
  fordi de kun bruger `node:test` og services. Kode, der kræver `express`/`yaml`, køres i
  containeren: `MSYS_NO_PATHCONV=1 docker compose exec -T -w /app backend node -` (Git Bash på
  Windows omskriver ellers `/app`).
- Pipe ikke et script, der opretter testdata, gennem `head` – det afbryder scriptet, før det
  sletter sine testbookinger.
- Tableau: REST API Connector, JSONPath `$` for objekter og `$[*]` for arrays (research R7).
  `by-room-type-season` med `season` som filter.
- Projektets dokumenter og kommentarer er på dansk; kode-identifikatorer på engelsk.
- Hver ændring er lavet med en begrundelse pr. ændring – brugeren beder om det.

## Næste skridt (anbefalet rækkefølge)

1. **Phase 5 (US3)**: T037 tests → T038 `barCalculations` → T039 `barSaleRepository` →
   T040 `barService` (udvid den eksisterende `listDrinks`) → T041 resten af routes → T044.
   Forventede tal: quickstart trin 6.
2. T048 Tableau-dashboard, når Phase 5 er færdig (alle datakilder findes da).
3. Uge 2: frontend T025, T035 (inkl. sæson-dropdown), T043.
4. T046 (route ↔ kontrakt), T049 (hele quickstart fra tom volumen), T050.
