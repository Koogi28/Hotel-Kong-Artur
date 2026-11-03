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
| 02/11 | Uge 1-arbejdet gemt: PR #7 merget til `main`, tagget `uge1-mysql` pushet | Tillægsopgave uge 2: arbejdet indtil nu skal være tilgængeligt ved præsentationen, før de nye løsninger udvikles |
| 02/11 | Konstitution 4.0.0 → 5.0.0: PostgreSQL i stedet for MySQL (II, V, IX), og alle Tableau-nøgletal skal kunne hentes fra API'et og vises i frontenden (IV) | Tillægsopgave uge 2: hotellet vil ikke have MySQL og vil læse dataanalyserne direkte i API'et |
| 02/11 | spec.md: FR-028–FR-030, SC-008, SC-009, US2 scenarie 8, US3 scenarie 7 og Clarifications 2026-11-02 | Samme. FR-028 er allerede opfyldt af de 11 KPI-endpoints. FR-029 dækkes af T035 og T043 |
| 02/11 | research R11 (PostgreSQL 16 + `pg`), plan.md, data-model.md og quickstart.md opdateret. R4 og R8 markeret som erstattet | PostgreSQL ligner MySQL mest og holder Docker-designet og fire biblioteker. MariaDB og SQLite fravalgt (R11) |
| 02/11 | Styleguide (`styleguide/`) koblet på: spec FR-031, FR-032, SC-010, research R12 (farver og skrifter målt på skærmbillederne) og afsnittet "Frontend-design" i plan.md | Gruppen har lavet en styleguide, så frontenden skal ligne hotellets hjemmeside. Uden krav i spec og plan ville `/speckit-tasks` og Converge ikke kende den (princip X) |
| 02/11 | FR-033 (land som dropdown med 21 lande), FR-034 (se og slette registrerede barsalg), US3 scenarie 8, to edge cases. Kontrakt 2.1.0 → 2.2.0: `GET /api/bar/sales` og `DELETE /api/bar/sales/{id}`. Tasks T073–T075 | Gruppens ønsker efter T043: fritekst gav stavevarianter, der splitter indtjening pr. land, og en fejlregistrering i baren kunne ikke rettes. Danmark tilføjet, fordi hotellet ligger i København |
| 03/11 | Tableau-dashboardet (T048, `HotelKongArthurDashboard.twbx`) bygget på `GET /api/bookings` og `bar/kpi/revenue-by-drink`, hvor Tableau summerer selv, og `bar/kpi/category-split` til barens omsætning og kategorifordelingen. Gruppens nøgletal (mest solgte kaffe og cocktail) beregnes fra `revenue-by-drink` efter `units_sold` i `Sheet 13`. research R7 ("Ændret 03/11"), spec.md Clarifications 2026-11-03, plan.md, quickstart trin 7, README, T048 og T070 opdateret. `/speckit-analyze` C1: filtrene på `season` og `country` på tværs af ark viser kombinationer, som intet endpoint har, og det stred mod princip IV. Gruppen valgte at ændre princippet: konstitution 5.0.0 → 5.1.0, og FR-028 og SC-008 er præciseret til casens nøgletal uden filter. T070 har fået en række for `by-room-type-season` (H1), og kontraktens beskrivelse nævner `/api/bookings` som Tableau-kilde (I1) | Casen siger, at dashboardet skal være interaktivt og "vise og beregne" nøgletallene med udgangspunkt i REST API'et. Filtre på land og sæson på tværs af ark gør det mere brugbart for beslutningstagere. Hvert af casens nøgletal findes stadig som endpoint og i frontenden, og data hentes kun via API'et. Summerne findes to steder, og det sikres af SC-008 (T070) |

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
| T071 udgået (03/11): SC-010, FR-031 og FR-032 (kontrast 4,5:1, kun tokens, 375 px, synligt fokus) er ikke tjekket formelt | Gruppen har gennemgået designet og godkendt det. Quickstart trin 9 med 375 px og Tab køres stadig i T049. Kontrastmålingen og gennemgangen af styleguidens regel 1–10 springes over |
| C1 (03/11): filterkombinationer i Tableau (fx indtjening pr. land i lavsæson) findes ikke som endpoint og vises ikke i frontenden | Bevidst valg (konstitution 5.1.0, princip IV): casen beder om et interaktivt dashboard, og filtre på tværs af ark gør det mere brugbart for beslutningstagere. Hvert af casens nøgletal (FR-016–FR-019, FR-024–FR-026) findes som endpoint og i frontenden, og data hentes kun via API'et. Kombinationerne kan ikke tjekkes mod API'et, men de bygger på de samme rækker som de tjekkede totaler (T070) |

**Rettet under Converge #1**: U3 (US2 scenarie 7 har nu aktøren "administratoren åbner
overblikket") og U4 (US2-introen nævner indtjening pr. værelsestype pr. sæson) i spec.md.
T056: kontrakten beskriver nu, at `search` over 100 tegn afkortes.

---

## Converge #2

*Det samlede tjek kommer efter frontend (T025, T035, T043), Tableau-dashboardet (T048) og T070–T072.
Her står delresultaterne, efterhånden som de er kørt.*

### T066: databaseskift MySQL → PostgreSQL verificeret (02/11)

**Kørt**: `docker compose down -v && docker compose up -d --build` fra tom volumen, derefter
quickstart trin 1–6 og 8 mod den kørende stack (T057–T065 færdige). Ingen gammel
`hotel-kong-artur_mysql_data`-volumen fandtes.

**Resultat: samme tal som `uge1-mysql` (SC-009) og ingen MySQL tilbage (FR-030).**

| Tjek | Resultat |
|------|----------|
| Trin 1: kun `db` + `backend`, `backend` venter på healthy `db`, `/api/health` | ✅ `{"status":"ok"}`, `/api-docs` → 200 |
| Trin 2: SQL-tjek i `psql` | ✅ 1000/1000/1000, Cocktail 20/Coffee 10, 54 Müller, Σ 11234034, bar 13448640.34, 8 værelsestyper |
| Trin 3: `npm test` i containeren (Node 20) | ✅ 55/55 |
| Trin 4: bookinger | ✅ POST → 201 `high` 3600 + `Location`. `search=muller` → 54. PUT 30/11 → `low` 2700. 400 med `fields` (dato/nætter, 6 felter, ukendt type). **PUT/DELETE historisk → 409** (boolean-rettelsen i T063 virker). 404. DELETE → 204 |
| Trin 5: nøgletal | ✅ Total 11234034/1000. 20/8/3/24 rækker med Σ 11234034. Belægning 0 → 0.5 % efter ny booking, 0 på afrejsedagen, `occupancy/nights` 3 nætter. Espresso 14656 / Whiskey Sour 3824 |
| Trin 6: bar | ✅ 179958 / 13448640.34, 52.83 / 47.17. +2 Espresso → 179960 og +138.20, Espresso 14658. `sold_at` `2026-11-02 13:35:55` (dansk tid, hele sekunder som kontrakten). quantity 0/-1 og ukendt drink → 400 |
| Trin 8: genstart | ✅ Testsalget tæller stadig efter `docker compose restart` (named volume `pg_data`) |
| Trin 8: SQL kun i `repositories/`, fire afhængigheder | ✅ `express, pg, swagger-ui-express, yaml` |
| `grep -rni mysql backend/src backend/tests compose.yaml docker db-init scripts .env.example .dockerignore .gitignore` | ✅ 0 træf |

**Bemærkninger**:

- `sold_at` lå 2 sekunder foran værtens ur. Det er urforskel mellem Docker-VM'en og Windows,
  ikke en tidszonefejl.
- Under udviklingen viste en test, at et salg fra en forbindelse i UTC fik en time forkert
  tidspunkt. Derfor sætter `db.js` forbindelsens tidszone (research R11, review-rettelse).

### T048 + T070: Tableau-dashboardet og SC-007/SC-008 (03/11)

**Kørt**: `docker compose down -v` (startdata), *Data → Refresh* i Tableau for alle tre
datakilder (`bookings`, `bar/kpi/revenue-by-drink` og `bar/kpi/category-split`) og alle filtre på *(All)*. Hvert tal er
aflæst i Tableau, i Swagger UI (endpointet) og i frontenden. Filterkombinationer på tværs af
ark sammenlignes ikke, fordi de ikke har et endpoint (konstitution 5.1.0, "Fund vi bevidst ikke
retter").

**Resultat: alle 10 af casens nøgletal har samme værdi i Tableau, API og frontend (SC-007,
SC-008, FR-028).**

| Nøgletal | Tableau-ark (datakilde) | Endpoint | Frontend-element | Værdi med startdata | |
|----------|-------------------------|----------|------------------|---------------------|---|
| Årets indtjening (FR-016) | `Yearly room revenue` (`bookings`, `SUM(total_price)`) | `GET /api/kpi/revenue/total` | `overview.html` `#total-revenue`, `#booking-count` | 11.234.034 (1000 bookinger) | ✅ |
| Gæster pr. land (FR-017) | `GuestsMap` og `GuestsPrCountry` (`bookings`, antal pr. `country`) | `GET /api/kpi/revenue/by-country` (`booking_count`) | `overview.html` `#country-rows` | South Korea 63, Egypt 31 | ✅ |
| Indtjening pr. land (FR-017) | `RevenuePrCountry` (`bookings`) | `GET /api/kpi/revenue/by-country` | `overview.html` `#country-rows` | South Korea 767.699, China 722.928, Egypt 335.786 | ✅ |
| Indtjening pr. værelsestype (FR-017) | `RevenuePrRoomType` (`bookings`) | `GET /api/kpi/revenue/by-room-type` | `overview.html` `#room-type-rows` | Suite 2.119.671, Standard Single 730.444 | ✅ |
| Indtjening pr. sæson (FR-017) | `Yearly room revenue` med `season`-filteret pr. sæson (`bookings`) | `GET /api/kpi/revenue/by-season` | `overview.html` `#season-rows` | high 4.070.570, mid 3.809.387, low 3.354.077 | ✅ |
| Værelsestype pr. sæson (FR-017) | `RevenuePrRoomType` med `season` = low (`bookings`) | `GET /api/kpi/revenue/by-room-type-season` | `overview.html` `#matrix-rows` med `#season-filter` = low | Suite low 626.488 | ✅ |
| Barens omsætning (FR-024) | `Yearly bar revenue` (`category-split`, `SUM(revenue)`) | `GET /api/bar/kpi/total` | `bar.html` `#total-revenue`, `#total-units` | 13.448.640,34 (179.958 enheder) | ✅ |
| Omsætning pr. drink (FR-025) | `DrinkRevenue` (`revenue-by-drink`) | `GET /api/bar/kpi/revenue-by-drink` | `bar.html` `#drink-rows` | Espresso 1.012.729,60, Mocha 842.019,23 | ✅ |
| Kategorifordeling (FR-026) | `PercentCategory` (`category-split`, API'ets `percent`) | `GET /api/bar/kpi/category-split` | `bar.html` `#split-cocktail`, `#split-coffee` | Cocktail 52,83 %, Coffee 47,17 % | ✅ |
| Eget nøgletal (FR-019) | `Sheet 13` "Oversigt over mest solgte drink og kaffe" (`revenue-by-drink`, filter `{FIXED [category] : MAX([units_sold])}`) | `GET /api/kpi/top-drinks` | `overview.html` `#top-coffee`, `#top-cocktail` | Espresso 14.656, Whiskey Sour 3.824 | ✅ |

**Live-test** (princip V): +1 booking (Denmark, december, Standard Single, 3 nætter) og
+1000 Espresso gav efter *Refresh* 11.237.634 (= 11.234.034 + 3.600) og Coffee 47,44 %
(= (6.343.884,91 + 69.100) / 13.517.740,34). Testdataene er slettet igen. Kontrolleret mod
API'et: 0 nye bookinger og 0 registrerede salg.

---

## Sidste Converge-tjek

*Kommer onsdag efter README, CONTRIBUTE.md og T049. Dette afsnit er det, der afleveres.*
