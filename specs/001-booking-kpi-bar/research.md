# Research: Bookinger, nøgletal og barsalg

**Feature**: `001-booking-kpi-bar` | **Dato**: 2026-10-28 | **Plan**: [plan.md](plan.md)

Hver beslutning har formatet *Beslutning / Begrundelse / Alternativer*. Tal om kildedata er
målt direkte på filerne i https://github.com/ITAKEA/hoteldata (klonet 2026-10-28).

---

## R1. Kildedata: indhold og kvalitet

**Fund** (målt på filerne):

| Fil | Rækker | Kolonner |
|-----|-------:|----------|
| `international_names_with_rooms_1000.csv` | 1000 + header | First Name, Family Name, Country, Room Type, Days Rented, Season, Price |
| `drinks_menu_with_sales.xlsx` | 30 + header | Drink Name, Category, Price (DKK), Units Sold |

- Bookinger: 8 værelsestyper (Standard Single 117, Grand Lit 118, Standard Double 117,
  Superior Double 134, Junior Suite 136, Spa Executive 138, Suite 137, LOFT Suite 103),
  20 lande, sæsoner `low` 332 / `mid` 335 / `high` 333, nætter 1–10, alle priser er hele kroner.
  Samlet pris for alle 1000 rækker: **11.234.034 DKK**. Længste navn/land: 14 tegn.
- Drikkevarer: 20 `Cocktail` + 10 `Coffee`. Priserne har op til 2 decimaler, men Excel gemmer
  enkelte som flydende tal (fx `91.40000000000001`).
- Historisk barsalg: 179.958 enheder, omsætning **13.448.640,34 DKK**; Cocktail 52,83 %,
  Coffee 47,17 %. Mest solgte kaffe: Espresso (14.656), mest solgte cocktail: Whiskey Sour (3.824).

**Beslutning**: CSV-filen er kilden for bookinger, og xlsx-filen er kilden for drikkevarer.
Drikkepriser afrundes til 2 decimaler (`DECIMAL(8,2)`).
**Begrundelse**: `91.40000000000001` er Excels binære repræsentation af 91,40. Afrundingen
gengiver værdien, som den står i regnearket, og ændrer ikke data (FR-003).
**Alternativer**: Gemme som `DOUBLE`. Det er afvist, fordi pengebeløb med flydende tal giver
afrundingsfejl i summer.

## R2. "M�ller" i bookingfilen

**Fund**: 54 rækker i CSV-filen har efternavnet `M�ller`. Byte-sekvensen er `EF BF BD`
(U+FFFD, Unicodes erstatningstegn), dvs. et "ü" der gik tabt ved en tidligere
tegnsætkonvertering, før filen blev gemt som UTF-8. Repoets egen
`international_names_with_rooms_1000.xlsx` indeholder de samme rækker med **"Müller"**.
En række-for-række-sammenligning af CSV og xlsx viser præcis 54 forskelle, og de forsvinder
alle, når `�` erstattes med `ü`. (xlsx-filen har desuden en løs celle med værdien `5379` under
datarækkerne; den er ikke en booking og ignoreres.)

**Beslutning**: I `db-init/02-seed.sql` skrives efternavnet som `Müller` i alle 54 rækker.
Alle andre værdier er uændrede.
**Begrundelse**: FR-003 forbyder at ændre eller opdigte data. Her retter vi en
kodningsfejl tilbage til den værdi, som kildens egen xlsx-udgave indeholder. Vi digter altså
ikke noget. Uden rettelsen ville søgning på "Müller" (FR-010) ikke finde gæsterne.
**Alternativer**: (a) Bevare `�`. Det er afvist, fordi søgning og visning så fejler. (b) Bruge
xlsx-filen som kilde for bookinger. Det er afvist, fordi opgaven peger på CSV-filen, og xlsx
har den løse ekstra celle. Rettelsen nævnes i en kommentar øverst i seed-filen.

## R3. Generering af seed-SQL

**Beslutning**: Seed-SQL genereres én gang af et lille Node-script uden afhængigheder
(`scripts/generate-seed.js`). Scriptet læser `scripts/source/international_names_with_rooms_1000.csv`
og `scripts/source/drinks_menu_with_sales.csv` og skriver `db-init/02-seed.sql`. Begge
kildefiler committes, så seed'en kan genskabes uden manuelle trin. Den genererede SQL
committes og gennemgås. Scriptet køres ikke ved opstart.

`drinks_menu_with_sales.csv` er skrevet direkte ud fra xlsx-filens celleværdier og **ikke** via
Excel. Dansk Excel gemmer CSV med semikolon og decimalkomma (`72,47`), og så ville scriptet
læse priserne forkert. Filen er kommasepareret, UTF-8, med decimalpunktum, 2 decimaler
(R1) og samme header som kilden. Kontrol: 30 rækker, 179.958 enheder, omsætning
13.448.640,34 DKK, svarende til tallene i R1. `international_names_with_rooms_1000.csv` er en
byte-identisk kopi af kilden (inkl. `�`, som scriptet retter, se R2).
**Begrundelse**: Node findes allerede i projektet. Et xlsx-bibliotek kun til 30 rækker ville
bryde princip I. Scriptet er kort og kan forklares, og den committede SQL kan tjekkes i
review.
**Alternativer**: (a) Skrive 1030 INSERT-rækker i hånden. Det er afvist, fordi det giver
tastefejl. (b) Bruge `LOAD DATA INFILE` på CSV ved opstart. Det er afvist, fordi det kræver
`secure_file_priv`-opsætning, og tegnfejlen fra R2 ville stadig skulle rettes. (c) Bruge et
xlsx-bibliotek (fx `exceljs`). Det er afvist pga. princip I.

Seed-filen starter med `SET NAMES utf8mb4;`, så "ü" gemmes korrekt uanset klientens standard.

## R4. MySQL-healthcheck og init-rækkefølge

**Beslutning**: `healthcheck: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "--silent"]`
med `interval: 5s`, `timeout: 5s`, `retries: 20`, `start_period: 30s`.
**Begrundelse**: Under første opstart kører MySQL-imagets entrypoint en midlertidig server
med `--skip-networking`, mens `/docker-entrypoint-initdb.d/*.sql` afvikles. En ping via
socket (`localhost`) svarer allerede "alive" i den fase. Ping via TCP (`127.0.0.1`) lykkes
først, når den rigtige server lytter, dvs. efter seed. `mysqladmin ping` returnerer exit-kode 0,
når serveren kører, også ved adgangsfejl, så det kræver intet password i healthchecken.
**Alternativer**: Et `sh -c`-check med `SELECT COUNT(*) FROM booking`. Det er afvist, fordi
det kræver password i kommandoen og er mere kompliceret.

Init-scripts afvikles i alfabetisk rækkefølge og **kun når data-volumen er tom**. Derfor:
`01-schema.sql` før `02-seed.sql`. `README.md` i `db-init/` ignoreres af entrypointet.

## R5. Docker Compose: rod-fil, `include` og dev-profil

**Beslutning**:
- `compose.yaml` (rod) definerer `db`, `backend` og volumen `mysql_data` og beholder
  `include: [docker/docker-compose.yml]`.
- `docker/docker-compose.yml` beholder kun dev-containeren `app` (og `claude_config`) med
  `profiles: [dev]`. `app`s `depends_on: db` fjernes, og miljøvariabler hentes med
  `env_file: ../.env` plus `MYSQL_HOST: db`.
- `db`-portmappingen `3307:3306` fjernes. Databasen er kun tilgængelig inde i
  compose-netværket. Fejlsøgning sker med `docker compose exec db mysql ...`.

**Begrundelse**:
- En fil, der hentes med `include`, indlæses som sin egen applikationsmodel. Den inkluderende
  fil kan referere til de inkluderede services, men ikke omvendt. `app` kan derfor ikke have
  `depends_on: db`, når `db` ligger i roden. `app` når stadig `db` via værtsnavnet, fordi alle
  services ender i samme projekt og standardnetværk (`name: hotel-kong-artur`).
- Relative stier i den inkluderede fil løses fra `docker/`, derfor `../.env`.
- Uden profil starter `docker compose up` kun `db` og `backend` (princip IX). Dev-containeren
  startes med `docker compose --profile dev up -d app`.
- Princip IV: Tableau og frontend må ikke gå uden om API'et, så der er ingen grund til at
  udstille MySQL på værten.

**Konsekvens for eksisterende installationer**: Volumen hedder fortsat
`hotel-kong-artur_mysql_data`. Hvis den allerede er oprettet (af skabelonens tomme init), kører
de nye init-scripts ikke. Første gang skal alle køre `docker compose down -v` (se
[quickstart.md](quickstart.md)).

**Alternativer**: (a) Lægge alt i én fil. Det er afvist, fordi opgaven kræver, at dev-filen
bevares via `include`. (b) Bevare `db` i `docker/`. Det er afvist pr. krav.

## R6. Hemmeligheder

**Beslutning**: `.env` (ignoreres allerede af `.gitignore` og `.dockerignore`) indeholder
`MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER` og `MYSQL_PASSWORD`. `.env.example`
med pladsholdere committes. `db`, `backend` og `app` læser filen med `env_file`.
**Begrundelse**: Princip XII. Ingen interpolation (`${...}`) er nødvendig, fordi de samme
variabelnavne bruges af MySQL-imaget og backend.
**Bemærk**: De nuværende passwords (`team_password`, `root_password`) står i Git-historikken.
De må ikke genbruges i `.env`.

## R7. Tableau Public og datatilgang

**Fund**:
- Tableau Public kan ikke forbinde til MySQL (krav fra gruppen) og forbinder til filer
  (tekst/CSV, Excel, JSON m.fl.).
- Web Data Connector 2.x blev markeret som udfaset i Tableau 2023.1 og skulle udgå i 2025.
- WDC 3.0 (`.taco`-connectorer bygget med TACO Toolkit fra npm) er dokumenteret for Tableau
  Desktop, Tableau Prep og Tableau Server. Tableau Public nævnes ikke. Desuden er WDC 3.0
  kun til udtræk (extract), og GitHub-repoet med WDC 3.0-ressourcerne er markeret som udfaset.

**Beslutning**: Vi bruger ikke WDC. API'et får CSV-eksport-endpoints, som Tableau Public
åbner som tekstfil. **Hver CSV indeholder færdigberegnede nøgletal, ikke rå rækker**:

| Endpoint | Svarer til JSON | Indhold (én række pr.) |
|----------|-----------------|------------------------|
| `kpi-totals.csv` | `kpi/revenue/total`, `bar/kpi/total` | nøgletal (`metric,value`): bookingomsætning, antal bookinger, barens enheder og omsætning |
| `revenue-by-country.csv` | `kpi/revenue/by-country` | land |
| `revenue-by-room-type.csv` | `kpi/revenue/by-room-type` | værelsestype |
| `revenue-by-season.csv` | `kpi/revenue/by-season` | sæson |
| `occupancy.csv` | `kpi/occupancy` | nat (bookede værelser, 214, %) |
| `top-drinks.csv` | `kpi/top-drinks` | topdrink pr. kategori (flere ved uafgjort) |
| `revenue-by-drink.csv` | `bar/kpi/revenue-by-drink` | drikkevare: historiske + registrerede enheder, i alt og omsætning |
| `bar-category-split.csv` | `bar/kpi/category-split` | kategori (enheder, omsætning, %) |

Alle ligger under `/api/export/`.

**Begrundelse**:
- *Nøgletal i backenden, ikke i Tableau*: Hvis Tableau fik rå bookingrækker og selv lavede
  `SUM`/`GROUP BY`, ville nøgletallene være beregnet i Tableau. Det strider mod princip II
  (beregninger i forretningslaget) og SC-007, og to implementeringer kan give forskellige tal.
  Med KPI-CSV'er viser Tableau kun tal, som backenden har beregnet, og hvert mærke i dashboardet
  svarer til én række. Den rå `bookings.csv` er derfor fravalgt.
- *Ingen dubleret logik*: `exportService` kalder de samme funktioner i `kpiService` og
  `barService` som JSON-controllerne. `csv.js` formaterer kun rækker til tekst. CSV og JSON kan
  derfor ikke vise forskellige tal.
- *Live*: Hver CSV beregnes ved hvert kald (princip V). `revenue-by-drink.csv`,
  `top-drinks.csv`, `bar-category-split.csv` og `kpi-totals.csv` bruger historiske enheder plus
  alle registrerede `bar_sale`, så Helenes nye salg kommer med i Tableau næste gang filen hentes.
- CSV virker i alle Tableau-udgaver uden ekstra værktøj, og endpoints er dokumenteret i
  OpenAPI (princip IV).
- *Gruppevalg*: Alternativet er rå rækker, hvor Tableau selv aggregerer. Det giver mere frihed
  i dashboardet, men nøgletallene beregnes så uden for backenden. Vi vælger KPI-CSV'erne.
  Vælger gruppen om, skal det begrundes her.
**"Live" i Tableau**: Efter nye bookinger eller barsalg hentes CSV-filerne igen (browser eller
`curl -o revenue-by-country.csv ...`), filen overskrives samme sted, og man vælger *Data → Refresh* i
Tableau Public.
**Alternativer**: (a) WDC 3.0. Det er afvist, fordi Tableau Public ikke er dokumenteret som
understøttet, og det kræver TACO Toolkit (ny afhængighed, i strid med princip I). (b) JSON-filer.
Tableau kan læse JSON, men flade CSV-tabeller er enklere at modellere. (c) Google Sheets som
mellemled. Det er afvist, fordi det er en genvej uden om API'et og ikke "live".

Kilder: [WDC deprecated in 2023.1 (Tableau KB)](https://kb.tableau.com/articles/en_US/Issue/web-data-connectors-deprecated-in-2023-1-release),
[Connectors built with the WDC 3.0 SDK (Tableau Help)](https://help.tableau.com/current/pro/desktop/en-us/examples_wdc_connector_sdk.htm),
[tableau/wdc3 (GitHub)](https://github.com/tableau/wdc3).

## R8. Datoer, tid og penge i Node/mysql2

**Beslutning**:
- mysql2-poolen oprettes med `dateStrings: true`, så `DATE` returneres som `"2026-12-06"` og
  ikke som et JS-`Date` i UTC, der kan flytte sig en dag.
- `decimalNumbers` slås **ikke** til. `DECIMAL`-priser kommer som strenge og omregnes i
  service til hele øre (`Math.round(Number(price) * 100)`). Alle summer laves i øre, og først
  svaret omregnes til kroner med 2 decimaler.
- Ankomstdato valideres i service: format `^\d{4}-\d{2}-\d{2}$`, og datoen skal være gyldig
  (`Date.UTC` + tjek af år/måned/dag, så "2026-02-31" afvises).
- Nætter for belægning beregnes med datoaritmetik i UTC for at undgå sommertidsfejl.
- `bar_sale.sold_at` sættes af databasen (`DEFAULT CURRENT_TIMESTAMP`). `db` kører med
  `TZ=Europe/Copenhagen`.

**Begrundelse**: Sådan undgår vi de klassiske tidszone- og flydende-tal-fejl med simple regler,
der kan unit-testes.
**Alternativer**: Et dato-bibliotek (dayjs/luxon). Det er afvist pga. princip I.

## R9. Forretningsregler, der ikke står eksplicit i specen

| Emne | Beslutning | Begrundelse |
|------|------------|-------------|
| Historisk booking ved PUT/DELETE | `409 Conflict` med JSON-fejl | FR-003 + edge case. 409 skelner "findes, men må ikke ændres" fra 400/404 |
| Kapacitetstjek ved oprettelse | Ingen. Belægning kan i teorien overstige 100 % | Princip VII: hotellet har 214 værelser uden fast fordeling pr. værelsestype, og kapaciteten bruges kun til at beregne belægningsgraden. Der findes ikke data til at tjekke ledighed pr. type. (FR-013 betyder "hver booking optager ét værelse" og er ikke et kapacitetskrav.) |
| Øvre grænse for nætter | 1–365 | Beskytter `occupancy.csv` mod absurde værdier. Kildedata har 1–10 |
| Øvre grænse for antal i barsalg | 1–1000 | Holder sig inden for `SMALLINT` og fanger tastefejl. Specen kræver kun ≥ 1 |
| Søgning | `?search=` matcher for-, efter- og fulde navn (`LIKE %…%`). Kollationen `utf8mb4_0900_ai_ci` gør "muller" = "Müller" | FR-010 |
| Lige mange solgte enheder | Alle drinks med maks.-antallet returneres pr. kategori | Edge case |
| Procentfordeling kaffe/cocktail | Cocktail afrundes til 2 decimaler, kaffe = 100 − cocktail. Uden salg giver begge 0 | US3-4: summen skal være præcis 100 |
| Mest solgte drink / barens totaler | Historiske `Units Sold` + registrerede `bar_sale` | Spec-antagelse ("samme år") |
| Valideringsfejl | `400 {"error": "...", "fields": ["arrival_date", ...]}` | Princip III + FR-005 (fejlen skal nævne felterne) |
| Database utilgængelig i `/api/health` | `503 {"status":"error"}` | Docker/drift skal kunne se, at DB mangler |

## R10. Tests uden database

**Beslutning**: Beregninger ligger som rene funktioner i forretningslaget
(`services/bookingRules.js`, `services/kpiCalculations.js`, `services/barCalculations.js`).
Services henter rækker fra repositories og kalder de rene funktioner. Unit-tests
(`node --test backend/tests/unit`) tester de rene funktioner med håndlavede rækker, bl.a. sæson
for alle 12 måneder, pris for alle 8 × 3 kombinationer, 30. nov → lavsæson, ugyldige datoer,
belægning over et månedsskifte, uafgjort top-drink og 100 %-summen.
**Begrundelse**: Det kræver hverken mocks, database eller ekstra bibliotek (princip I, XII).
**Alternativer**: Integrationstests mod en test-MySQL. De er udskudt. Quickstart dækker
end-to-end manuelt.
