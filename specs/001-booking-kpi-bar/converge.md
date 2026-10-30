# Converge-resultater – 001-booking-kpi-bar

Resultatet af hvert Converge-tjek: koden holdt op mod [spec.md](spec.md), [plan.md](plan.md),
[tasks.md](tasks.md) og konstitutionen. Hvad er implementeret, og hvad mangler.
Det sidste afsnit er afleveringens "resultat af jeres sidste Converge-tjek".

---

## Converge #1 (30/10)

**Kørt med**: T046 (routes ↔ kontrakt), T047 (konstitutionstjek), `/speckit-analyze` (to gange)
og `/speckit-converge`, der tilføjede Phase 8 (T052–T056).

**Status**: 44/53 tasks færdige (83 %), talt fra fluebenene i tasks.md. Backend til alle tre user stories er færdig.
Frontend og Tableau-dashboard mangler.

### 1. Implementeret

**US1 – Bookinger (P1)**: 6/7 tasks

| Krav | Status | Bevis |
|------|--------|-------|
| FR-001–FR-003 startdata (1000 bookinger, 30 drinks, historiske uændrede) | ✅ | Seed-tjek (T013), PUT/DELETE på historisk → 409 |
| FR-004, FR-005 opret og valider (alle fejlfelter på én gang) | ✅ | Unit-tests, quickstart trin 4 |
| FR-006–FR-009 periode, sæson, pris | ✅ | Unit-tests for alle 12 måneder og 8 × 3 priser |
| FR-010 søgning (accent-ufølsom, "muller" → 54 Müller) | ✅ | Quickstart trin 4 |
| FR-011, FR-012 ret og slet nye bookinger | ✅ | Swagger "Try it out" (T026, T050) |
| FR-013 én booking = ét værelse | ✅ | Belægningsberegning |
| FR-014 i browseren | ⏸ | T025 (uge 2) |
| FR-015 Swagger UI | ✅ | `/api-docs`, T050 |

**US2 – Nøgletal (P2)**: 7/8 tasks

| Krav | Status | Bevis |
|------|--------|-------|
| FR-016 samlet indtjening (11234034 / 1000) | ✅ | Quickstart trin 5 |
| FR-017 pr. land / værelsestype / sæson (20 / 8 / 3) og pr. værelsestype pr. sæson (24) | ✅ API | Σ = 11234034 i alle fire. Sæson-dropdown i oversigten: T035 |
| FR-018 belægning pr. nat (÷ 214, kun med ankomstdato) og pr. nat-serie | ✅ | Unit-tests, "Live": 0 → 0.5 % |
| FR-019 topdrinks (Espresso 14656, Whiskey Sour 3824, alle ved uafgjort) | ✅ | Quickstart trin 5 |
| FR-020 beregnes ved hvert kald | ✅ | "Live": ny booking og nyt salg tæller med det samme |
| FR-021 Tableau | ⏸ | Datakilder klar (JSON, flade svar). Dashboard: T048 |

**US3 – Barsalg (P3)**: 6/7 tasks

| Krav | Status | Bevis |
|------|--------|-------|
| FR-022, FR-023 registrér salg, tidspunkt automatisk | ✅ | `POST /api/bar/sales` → 201. `sold_at` i dansk tid (DB kører CET) |
| FR-024 total (179958 / 13448640.34) | ✅ | Quickstart trin 6, også mod seed-filen |
| FR-025 omsætning pr. drink (alle 30, også 0) | ✅ | Unit-tests, quickstart trin 6 |
| FR-026 kaffe/cocktail-fordeling (52.83 / 47.17, sum præcis 100) | ✅ | Unit-tests, quickstart trin 6 |
| FR-027 Tableau | ⏸ | Datakilder klar. Dashboard: T048 |
| Barens side i browseren | ⏸ | T043 (uge 2) |

**Verificeret**:

- 55/55 unit-tests grønne (`npm test`): sæson, pris, validering, nøgletal og barberegninger.
  Beløb regnes i øre, så summer ikke får flydende-tal-fejl.
- Quickstart trin 4–6 mod kørende containere, inkl. "Live" (opret → tal ændres → slet).
- T046: 19 routes = 19 operationer i kontrakten. 34 kald gav de forventede, dokumenterede
  statuskoder, og alle svar har kontraktens felter og typer.
- T047: SQL kun i `repositories/`, ingen beregning i `controllers/`, `.env` ikke i Git,
  kun de fire afhængigheder, data overlever `docker compose restart`.
- Swagger "Try it out" for booking og bar (T026, T044, T050).
- Tableau: `/api/bookings` testet 29/10. KPI-endpoints testet manuelt i Tableau Desktop 30/10
  (REST API Connector, `by-room-type-season` med sæsonfilter og `category-split`), og tallene
  stemmer med Swagger UI. Ingen screenshots (gruppens beslutning). Dashboardet bygges i T048.

### 2. Mangler

| Hvornår | Tasks | Hvad |
|---------|-------|------|
| Mandag | T025, T035, T043 | Booking-side, oversigt med sæson-dropdown og barens side i browseren (FR-014, SC-001, SC-003) |
| Mandag | – | Tableau Desktop forbundet til alle KPI-endpoints |
| Tirsdag | T048 | Tableau-dashboardet (FR-021, FR-027, SC-007) |
| Tirsdag | T055 | Converge #2 i denne fil |
| Onsdag | T045, T053 | README med opsætning og Mermaid-arkitekturdiagram |
| Onsdag | T052 | `CONTRIBUTE.md` |
| Onsdag | T049 | Hele quickstart fra tom volumen og tidsmål SC-001 (< 2 min) og SC-003 (< 15 sek) |
| Onsdag | T055 | Sidste Converge-tjek i denne fil |

Phase 8 (fra `/speckit-converge`): T052–T056. Ingen CRITICAL eller HIGH fund. T054 (denne fil)
og T056 (søgningens begrænsning i kontrakten) er lavet under Converge #1.

### 3. Ændringer siden spec'en blev skrevet

| Dato | Ændring | Begrundelse |
|------|---------|-------------|
| 29/10 | CSV-eksport erstattet af JSON via Tableaus REST API Connector. T028, T030 og T042 udgået, T034 omskrevet til `GET /api/kpi/occupancy/nights`, `top-drinks` gjort flad | Tableau Desktop kan hente JSON direkte fra API'et, så der kun er én datakilde (research R7, princip IV) |
| 30/10 | FR-017 udvidet med indtjening pr. værelsestype pr. sæson: `GET /api/kpi/revenue/by-room-type-season`, 24 rækker inkl. 0. Kontrakt 2.0.0 → 2.1.0. US2 fik acceptscenarie 7 | Casen kræver "pr værelsestype (pr sæson)", og et sæsonfilter i Tableau kræver et `season`-felt på hver række (research R7) |
| 30/10 | Afsnittet "Afleveringsmateriale" tilføjet i plan.md (README med diagram, CONTRIBUTE.md, converge.md) | Casens afleveringskrav stod ingen steder i artefakterne, så Converge kunne ikke finde dem (princip X) |

### 4. Fund vi bevidst ikke retter

| Fund | Begrundelse |
|------|-------------|
| Intet kapacitets- eller overbookingtjek ved oprettelse | Konstitution VII og research R9: de 214 værelser har ingen fast fordeling pr. type, og kapaciteten bruges kun til belægningsgraden. Belægningen kan i teorien overstige 100 % |
| Statuskoderne 409, 500 og 503 ud over princip III's liste | Begrundet i plan.md (Constitution Check og Complexity Tracking). 409 skelner "findes, men er låst" fra 400/404 |
| U2: `by-room-type-season` sorteres efter værelsestype og sæson, ikke efter omsætning som de andre `revenue/*` | Fast rækkefølge gør filtrering i Tableau og oversigten forudsigelig. Står i kontrakten |
| `top-drinks` og `category-split` viser Cocktail før Coffee | Fast alfabetisk rækkefølge. Kontrakten kræver ingen bestemt rækkefølge, og Tableau sorterer selv |
| T050 afsluttet uden screenshots | Gruppens beslutning 30/10: afprøvet i Swagger UI. `docs/screenshots/` findes derfor ikke |
| De gamle passwords ligger i Git-historikken | Kendt og håndteret: nye passwords i `.env`, og `.env.example` advarer. Historikken omskrives ikke |
| G1: kontrakt og kode i samme commit | Ikke længere et fund: opfyldt i commit `f6e95a1` |

**Rettet under Converge #1**: U3 (US2 scenarie 7 har nu aktøren "administratoren åbner
overblikket") og U4 (US2-introen nævner indtjening pr. værelsestype pr. sæson) i spec.md.
T056: kontrakten beskriver nu, at `search` over 100 tegn afkortes.

---

## Converge #2

*Kommer tirsdag efter frontend (T025, T035, T043) og Tableau-dashboardet (T048).*

---

## Sidste Converge-tjek

*Kommer onsdag efter README, CONTRIBUTE.md og T049. Dette afsnit er det, der afleveres.*
