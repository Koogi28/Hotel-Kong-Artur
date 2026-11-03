<!--
Sync Impact Report (2026-11-03)
- Version: 5.0.0 → 5.1.0 (MINOR). Princip IV får en udtrykkelig tilladelse til, at Tableau
  filtrerer og kombinerer nøgletal på tværs af ark. Kravet om, at hvert af casens nøgletal skal
  kunne hentes fra et endpoint og vises i frontenden, er uændret. Det samme gælder "kun via
  API'et" og forbuddet mod beregning i frontenden. Ingen principper er fjernet eller tilføjet.
- Ændrede principper:
  - IV. OpenAPI og Swagger: "Alle nøgletal, der vises i Tableau, SKAL også kunne hentes …" →
    "Hvert af casens nøgletal SKAL kunne hentes fra et endpoint … Tableau MÅ filtrere og
    kombinere dem på tværs af ark, så længe de underliggende data kommer fra API'et."
  - Kvalitetsporte: spørgsmålet om Tableau-nøgletal har fået samme formulering.
- Begrundelse:
  - Casen siger, at dashboardet skal være interaktivt og "vise og beregne" nøgletallene med
    udgangspunkt i REST API'et. Filtre på land og sæson på tværs af ark gør dashboardet mere
    brugbart for beslutningstagere.
  - Hvert af casens nøgletal (spec FR-016–FR-019, FR-024–FR-026) findes stadig som endpoint og
    vises i frontenden. Data hentes stadig kun via API'et, aldrig direkte fra databasen.
  - Trade-off: kombinationer som "indtjening pr. land i lavsæson" findes kun i Tableau og kan
    ikke hentes fra API'et. Det accepterer vi bevidst.
- Aftalt i gruppen 03/11.
- Tilføjede sektioner: ingen. Fjernede sektioner: ingen.
- Skabeloner: .specify/templates/plan-template.md, spec-template.md og tasks-template.md ✅
  ingen ændring nødvendig (de henviser til konstitutionen generelt, ikke til princip IV's
  ordlyd).
- Opfølgning i feature 001: spec.md (Clarifications 2026-11-03, FR-028, SC-008), research.md R7,
  plan.md (Constitution Check), quickstart.md trin 7, README.md, tasks.md T048/T070 og
  converge.md ✅ opdateret i samme commit.
-->

# Hotel Kong Arthur Constitution

## Core Principles

### I. Simpelt frem for smart

Vi er studerende på 3. semester, og koden skal kunne læses og forklares af alle i gruppen.

- Vi SKAL vælge den simpleste løsning, der virker.
- Der MÅ IKKE tilføjes frameworks, biblioteker eller features, som opgaven og vores user
  stories ikke kræver.
- Et nyt bibliotek eller en ekstra abstraktion SKAL begrundes i planen (hvilken user story
  kræver det, og hvorfor er det simpleste alternativ ikke nok).

### II. 3-lagsarkitektur

Backenden har præcis tre lag:

1. **Præsentationslag**: REST-controllere.
2. **Forretningslag**: beregninger, validering og regler som udregning af sæson og pris.
3. **Datalag**: adgang til PostgreSQL.

- Et lag MÅ KUN kalde laget lige under sig.
- Controllere MÅ IKKE indeholde SQL eller beregninger.
- SQL MÅ KUN findes i datalaget.

Begrundelse: lagene gør koden let at finde rundt i, og forretningsreglerne kan testes uden
HTTP og uden database.

### III. REST API med JSON

- Al kommunikation med backenden SKAL ske via et REST API, der sender og modtager JSON.
- Endpoints SKAL bruge korrekte HTTP-metoder: GET (hent), POST (opret), PUT (ændr),
  DELETE (slet).
- Svar SKAL bruge korrekte statuskoder: 200, 201, 204, 400 og 404.
- Fejl SKAL returneres som JSON med en forståelig besked, fx `{"error": "Antal nætter skal
  være mindst 1"}`.

### IV. OpenAPI og Swagger

- API'et SKAL være beskrevet i en OpenAPI-specifikation og kunne afprøves i Swagger UI.
- Frontend og Tableau SKAL hente data via det samme API; der findes ikke separate
  "genveje" til databasen.
- Hvert af casens nøgletal SKAL kunne hentes fra et endpoint i REST API'et og vises i
  frontend-prototypen. Frontenden SKAL læse tallene fra API'et og MÅ IKKE selv beregne dem
  (se II).
- Tableau MÅ filtrere og kombinere nøgletallene på tværs af ark (fx indtjening pr. land i én
  sæson), så længe de underliggende data kommer fra API'et. Sådanne kombinationer behøver ikke
  et eget endpoint.
- Når et endpoint ændres, SKAL specifikationen opdateres i samme commit.

### V. Databasen er sandheden (live data)

- Alle data SKAL ligge i PostgreSQL-databasen. MySQL MÅ IKKE bruges (hotellets krav, uge 2).
- CSV- og Excel-filerne bruges KUN til at fylde databasen ved første opstart.
- Nøgletal SKAL beregnes ud fra databasen, når de hentes, og MÅ ALDRIG gemmes som
  færdige tal.
- "Live" betyder hos os: en ny booking eller et nyt barsalg kan ses i nøgletal og
  dashboard, når siden opdateres.

### VI. Bookinger har ankomstdato og antal nætter

- En ny booking SKAL have en ankomstdato og et antal nætter på mindst 1; ellers afvises
  bookingen (400). Afrejsedato indgår ikke.
- Bookingens periode er nætterne fra ankomstdatoen og antal nætter frem; perioden bruges til
  belægningsgrad.
- For nye bookinger SKAL sæsonen udregnes ud fra ankomstdatoens måned, og prisen ud fra sæson,
  værelsestype og antal nætter. Sæson og pris MÅ IKKE indtastes, så tallene altid passer sammen.
- De historiske bookinger fra datafilen har ingen datoer. De SKAL gemmes med sæson, antal
  nætter og pris, præcis som de står i filen.
- Data fra datafilen MÅ IKKE ændres eller opdigtes (fx må der ikke findes på datoer til de
  historiske bookinger).

Begrundelse: nye bookinger skal kunne indgå i belægningsgraden, mens de historiske data skal
forblive en tro kopi af kilden, så nøgletallene bygger på rigtige tal.

### VII. Hotellets kapacitet

- Hotellet har 214 værelser i alt, uden fast fordeling pr. værelsestype.
- Belægningsgraden for en nat SKAL beregnes som antal bookede værelser den nat divideret
  med 214, kun ud fra bookinger med ankomstdato.
- Beregningen SKAL ligge i forretningslaget (se II).

### VIII. Barsalg registreres ét ad gangen

- Der er kun én medarbejder i baren, Helene Christine.
- Hvert salg i baren SKAL gemmes som én registrering med drikkevare, antal og tidspunkt.
- Menuen består af de 20 cocktails og 10 kaffetyper fra datafilen.
- Omsætning og fordelinger SKAL beregnes ud fra registreringerne (se V).

### IX. Docker

- Hele systemet (database, backend og frontend) SKAL starte med én kommando:
  `docker compose up`.
- Backenden SKAL vente på, at databasen er klar (healthcheck), før den starter.
- Data SKAL bevares, når containerne genstartes (navngivet volume til PostgreSQL).

### X. Spec først, så kode

- Vi følger Spec Kit i rækkefølgen: spec → plan → tasks → kode.
- Der MÅ IKKE skrives kode, før der findes en task til den.
- Hver user story SKAL have acceptkriterier, som vi kan teste.

### XI. Vi ejer koden, selvom AI'en skriver den

- AI'en laver ÉN task ad gangen.
- Koden SKAL gennemgås af et gruppemedlem, før den committes.
- Alle i gruppen SKAL kunne forklare koden.
- Den, der har givet AI'en opgaven, committer koden under eget navn.

### XII. Sikkerhed og orden

- Passwords og andre hemmeligheder MÅ IKKE ligge i GitHub. De ligger i en `.env`-fil, som
  står i `.gitignore`; en `.env.example` uden rigtige værdier må gerne committes.
- Beregning af nøgletal, sæson og pris SKAL have simple automatiske tests.

## Kvalitetsporte

Før en plan godkendes, og før en task markeres som færdig, tjekkes:

- Bruger løsningen kun det, user storyen kræver? (I)
- Ligger SQL kun i datalaget og beregninger kun i forretningslaget? (II)
- Bruger nye endpoints rigtige metoder, statuskoder og JSON-fejl? (III)
- Er OpenAPI-specifikationen opdateret? (IV)
- Kan hvert af casens nøgletal hentes fra et endpoint og ses i frontenden, og henter Tableau
  kun data via API'et? (IV)
- Beregnes nøgletal fra databasen ved hver forespørgsel? (V)
- Har bookingændringer test for ankomstdato, antal nætter, sæson og pris? (VI, XII)
- Starter systemet stadig med `docker compose up`? (IX)
- Er der ingen hemmeligheder i de ændrede filer? (XII)

## Udviklingsforløb

1. `/speckit-specify`: beskriv user story med acceptkriterier.
2. `/speckit-clarify` (valgfri): afklar uklarheder.
3. `/speckit-plan`: lav en plan og tjek den mod Kvalitetsporte.
4. `/speckit-tasks`: del planen op i tasks.
5. `/speckit-implement`: AI'en løser én task ad gangen.
6. Et gruppemedlem gennemgår koden, og den der gav opgaven committer.

## Governance

- Denne konstitution går forud for alle andre aftaler om, hvordan projektet laves.
- Ændringer SKAL aftales i gruppen og laves via `/speckit-constitution`, så version og dato
  opdateres.
- Versionering følger semantisk versionering:
  - MAJOR: et princip fjernes eller ændrer betydning.
  - MINOR: et nyt princip eller en ny sektion tilføjes.
  - PATCH: formuleringer og stavefejl rettes.
- Ved hver kodegennemgang SKAL reviewer tjekke ændringen mod Kvalitetsporte.
- Afvigelser fra et princip SKAL begrundes skriftligt i planen.

**Version**: 5.1.0 | **Ratified**: 2026-10-27 | **Last Amended**: 2026-11-03
