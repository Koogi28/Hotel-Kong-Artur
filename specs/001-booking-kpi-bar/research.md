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
13.448.640,34 DKK, svarende til tallene i R1. `international_names_with_rooms_1000.csv` er
**ikke byte-identisk** med kilden, fordi Git har normaliseret linjeskiftene til LF ved commit,
og på Windows kan filen blive checket ud med CRLF. **Indholdet er det samme** (alle 1000 rækker
inkl. `�`, som scriptet retter, se R2). Derfor læser `generate-seed.js` både `\n` og `\r\n`
og en eventuel BOM. Scriptet giver præcis samme `02-seed.sql` med begge linjeskift (testet).
**Begrundelse**: Node findes allerede i projektet. Et xlsx-bibliotek kun til 30 rækker ville
bryde princip I. Scriptet er kort og kan forklares, og den committede SQL kan tjekkes i
review.
**Alternativer**: (a) Skrive 1030 INSERT-rækker i hånden. Det er afvist, fordi det giver
tastefejl. (b) Bruge `LOAD DATA INFILE` på CSV ved opstart. Det er afvist, fordi det kræver
`secure_file_priv`-opsætning, og tegnfejlen fra R2 ville stadig skulle rettes. (c) Bruge et
xlsx-bibliotek (fx `exceljs`). Det er afvist pga. princip I.

Seed-filen starter med `SET NAMES utf8mb4;`, så "ü" gemmes korrekt uanset klientens standard.

## R4. MySQL-healthcheck og init-rækkefølge (erstattet af R11)

**Beslutning**:
`healthcheck: ["CMD-SHELL", "mysqladmin ping -h 127.0.0.1 -u\"$$MYSQL_USER\" -p\"$$MYSQL_PASSWORD\" --silent"]`
med `interval: 5s`, `timeout: 5s`, `retries: 20`, `start_period: 30s`.
**Begrundelse**: Under første opstart kører MySQL-imagets entrypoint en midlertidig server
med `--skip-networking`, mens `/docker-entrypoint-initdb.d/*.sql` afvikles. En ping via
socket (`localhost`) svarer allerede "alive" i den fase. Ping via TCP (`127.0.0.1`) lykkes
først, når den rigtige server lytter, dvs. efter seed.
**Hvorfor login**: Første version pingede uden login, ud fra at `mysqladmin ping` returnerer
exit-kode 0 også ved adgangsfejl. Hos gruppen gav ping uden login på MySQL 8.0.46 i stedet
"Access denied" og exit 1, så `db` blev aldrig *healthy*, og `backend` startede aldrig.
Healthchecken logger derfor ind med `MYSQL_USER`/`MYSQL_PASSWORD` fra containerens miljø
(kommer fra `.env`). `$$` gør, at Compose ikke selv udfylder variablerne. Det gør
containerens shell, så passwordet ikke står i `compose.yaml`. Brugeren oprettes under init,
så login lykkes først, når init er færdig. Det understøtter TCP-reglen ovenfor.
(Bemærk: På én maskine med samme version gav ping uden login exit 0. Opførslen er altså ikke
ens alle steder, og login virker begge steder.)
**Alternativer**: Et check med `SELECT COUNT(*) FROM booking`. Det er afvist, fordi det er mere
kompliceret og koblet til skemaet.

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

## R7. Tableau og datatilgang

**Beslutning (ændret 29/10)**: Tableau **Desktop** henter nøgletallene direkte fra REST API'et
som JSON med Tableaus **REST API Connector** fra Tableau Exchange. Det er **plan A**.
CSV-eksport er fravalgt (se nedenfor). Den første beslutning (CSV-eksport til Tableau Public)
og testen, der førte til den, står under *Baggrund*.

**Opsætning**: Tableau Desktop 2026.3.0 (20263.26.1022.1645). REST API Connector kræver
Desktop 2023.3 eller nyere. Den henter JSON via HTTP GET og udpeger rækkerne med en JSONPath:

| Svar fra API'et | JSONPath | Rækker i Tableau |
|-----------------|----------|------------------|
| Fladt array, fx `kpi/revenue/by-country` | `$[*]` | én pr. element |
| Fladt objekt, fx `kpi/revenue/total` | `$` | én |

Connectoren laver kun udtræk (extract). Nye tal vises, når man vælger *Data → Refresh*. Det
passer med princip V ("live" = synligt, når man opdaterer).

**Afprøvet 29/10** mod `GET /api/bookings` med JSONPath `$[*]`: 1000 rækker hentet. Nye
bookinger kom med efter *Data → Refresh* (1000 → 1002) og forsvandt igen efter `DELETE`.

**Endpoints til Tableau** (alle JSON, alle flade, ingen nestede objekter):

| Endpoint | JSONPath | Indhold (én række pr.) |
|----------|----------|------------------------|
| `kpi/revenue/total` | `$` | `total_revenue`, `booking_count` |
| `kpi/revenue/by-country`, `by-room-type`, `by-season` | `$[*]` | gruppe: `key`, `revenue`, `booking_count` |
| `kpi/revenue/by-room-type-season` | `$[*]` | kombination: `room_type`, `season`, `revenue`, `booking_count` (24 rækker) |
| `kpi/occupancy/nights` | `$[*]` | nat: `date`, `booked_rooms`, `capacity`, `occupancy_percent` |
| `kpi/top-drinks` | `$[*]` | topdrink: `category`, `drink_id`, `name`, `units_sold` (flere ved uafgjort) |
| `bar/kpi/total` | `$` | `units_sold`, `revenue` |
| `bar/kpi/revenue-by-drink` | `$[*]` | drikkevare: historiske + registrerede enheder, i alt og omsætning |
| `bar/kpi/category-split` | `$[*]` | kategori: `units_sold`, `revenue`, `percent` |

Alt, hvad de tidligere CSV-filer indeholdt, findes nu som JSON. `kpi/occupancy/nights` er ny
og dækker samme interval som `occupancy.csv`: hver nat fra den tidligste til den seneste nat,
der er dækket af en booking med ankomstdato. `kpi/top-drinks` er gjort flad (før
`{coffee: [...], cocktail: [...]}`), og `revenue-by-drink`/`category-split` har fået de felter,
som kun CSV'erne havde.

*(Tilføjet 30/10, kontrakt 2.1.0)* `kpi/revenue/by-room-type-season` er tilføjet, fordi casen
kræver indtjening "pr værelsestype (pr sæson)", og et sæsonfilter i Tableau kræver et
`season`-felt på hver række. `by-room-type` har kun `key`, så Tableau kan ikke filtrere den på
sæson. Alle 24 kombinationer kommer med (også 0), så en værelsestype ikke forsvinder fra
grafen, når der filtreres på en sæson uden bookinger af den.

**Begrundelse**:
- *Nøgletal i backenden, ikke i Tableau*: Tableau får færdigberegnede nøgletal og viser dem.
  Hvis Tableau fik rå bookingrækker og selv lavede `SUM`/`GROUP BY`, ville nøgletallene være
  beregnet i Tableau. Det strider mod princip II og SC-007, og to implementeringer kan give
  forskellige tal.
- *Én kilde*: Tableau, frontend og Swagger UI bruger de samme JSON-endpoints. Der er ingen
  ekstra `exportService` eller CSV-formattering, der kan give andre tal end JSON.
- *Flade svar*: Med ét niveau kan hvert endpoint læses med `$` eller `$[*]` uden at folde
  nestede felter ud i Tableau.
- *Live*: Hvert endpoint beregnes ved hvert kald (princip V), og *Refresh* henter nye tal.

**CSV-eksport er fravalgt**, fordi:
- Den kun var nødvendig, så længe vi brugte Tableau Public, som ikke kan læse JSON fra en URL.
- Den krævede et ekstra lag (`exportService`, `csv.js`, 8 endpoints), som gentog JSON-svarene.
- "Live" krævede, at filerne blev hentet ned igen med browser eller `curl` før hver *Refresh*.
  Med REST API Connector henter Tableau selv.
- `text/csv` var en begrundet afvigelse fra princip III (JSON). Den afvigelse forsvinder.

**Direkte MySQL-forbindelse fravælges bevidst**: Tableau Desktop kan forbinde direkte til
MySQL, men det gør vi ikke. Princip IV kræver, at Tableau henter data via det samme API som
frontenden, og nøgletallene ville så skulle beregnes igen i Tableau. Desuden har `db` ingen åben
port på værten (R5), så forbindelsen ville kræve, at vi udstillede databasen.

**Baggrund: Tableau Public (første beslutning, 28/10)**

*Fund*:
- Tableau Public kan ikke forbinde til MySQL (krav fra gruppen) og forbinder til filer
  (tekst/CSV, Excel, JSON m.fl.).
- Web Data Connector 2.x blev markeret som udfaset i Tableau 2023.1 og skulle udgå i 2025.
- WDC 3.0 (`.taco`-connectorer bygget med TACO Toolkit fra npm) er dokumenteret for Tableau
  Desktop, Tableau Prep og Tableau Server. Tableau Public nævnes ikke. Desuden er WDC 3.0
  kun til udtræk (extract), og GitHub-repoet med WDC 3.0-ressourcerne er markeret som udfaset.

*Afprøvet 28/10* (Tableau Public, version ikke noteret):
- Under *Connect* findes bl.a. **Text file**, **JSON file**, **OData** og
  **"Web Data Connector (deprecated)"** (WDC 2.x).
- WDC findes altså i Tableau Public, men er markeret som udfaset.
- **OData-test** mod den offentlige Northwind-tjeneste: virker. 77 rækker blev hentet direkte
  via URL.
- **CSV-test**: virker. Decimaler læses korrekt (decimalpunktum), og *Refresh* (F5) viser
  ændrede tal, når filen er overskrevet.

Ud fra testen blev CSV-eksport valgt som plan A for Tableau Public, med OData som mulig
forbedring. **Hvorfor beslutningen er ændret**: Gruppen har skiftet til Tableau Desktop, hvor
REST API Connector kan læse JSON direkte fra API'et. Så er der ikke længere brug for CSV-filer
som mellemled, og OData (nyt format og nye endpoints) er heller ikke nødvendigt.

**Alternativer**: (a) CSV-eksport. Fravalgt, se ovenfor. (b) Direkte MySQL-forbindelse.
Fravalgt, se ovenfor. (c) WDC 2.x. Udfaset og derfor afvist. (d) WDC 3.0. Det er afvist, fordi
det kræver TACO Toolkit (ny afhængighed, i strid med princip I), og REST API Connector løser
det samme uden egen kode. (e) OData. Det er ikke længere nødvendigt, fordi Tableau Desktop
læser almindelig JSON. (f) JSON-filer downloadet til disk. Det er afvist, fordi REST API
Connector henter direkte fra URL'en.

Kilder: [WDC deprecated in 2023.1 (Tableau KB)](https://kb.tableau.com/articles/en_US/Issue/web-data-connectors-deprecated-in-2023-1-release),
[Connectors built with the WDC 3.0 SDK (Tableau Help)](https://help.tableau.com/current/pro/desktop/en-us/examples_wdc_connector_sdk.htm),
[tableau/wdc3 (GitHub)](https://github.com/tableau/wdc3).

## R8. Datoer, tid og penge i Node/mysql2 (databasedelen erstattet af R11)

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
| Øvre grænse for nætter | 1–365 | Beskytter `kpi/occupancy/nights` mod absurde intervaller. Kildedata har 1–10 |
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

## R11. Skift fra MySQL til PostgreSQL (tillægsopgave uge 2, 2026-11-02)

Hotellet vil ikke have MySQL (spec FR-030, konstitution 5.0.0). R4, R8 og søgningen i R9
beskriver MySQL-versionen, som er gemt i Git-tagget `uge1-mysql`. Denne beslutning erstatter
dem, hvor de er i konflikt.

**Beslutning**: PostgreSQL 16 (`postgres:16-alpine`) med driveren `pg` i stedet for `mysql2`.

**Begrundelse**:
- Samme opbygning som før: egen `db`-container med named volume, healthcheck og
  `/docker-entrypoint-initdb.d`. Compose-design, 3 lag og Tableau via API'et ændres ikke.
- Stadig fire runtime-biblioteker (`pg` erstatter `mysql2`), så princip I holder.
- Det er den mest udbredte open source-database ud over MySQL, og SQL'en minder meget om den,
  vi har. Kun datalaget, skemaet og seed-scriptet skal ændres.

**Alternativer**:
- *MariaDB*: næsten ingen kodeændringer, men en fork af MySQL. Afvist, fordi hotellet kan opfatte
  det som MySQL.
- *SQLite*: ingen database-container, kun en fil. Afvist, fordi det ændrer arkitekturen mere
  (ingen `db`-service, ingen healthcheck) og passer dårligere til et adskilt datalag i Docker.

**Hvad ændres** (MySQL → PostgreSQL):

| Emne | MySQL (uge 1) | PostgreSQL | Hvorfor |
|------|---------------|------------|---------|
| Image og volume | `mysql:8.0`, `mysql_data:/var/lib/mysql` | `postgres:16-alpine`, `pg_data:/var/lib/postgresql/data` | Fast major-version, lille image |
| Miljøvariabler | `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST` | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (imaget), `DB_HOST=db` (backend) | Imagets egne navne. Ingen root-bruger: `POSTGRES_USER` er ejer af databasen |
| Healthcheck | `mysqladmin ping -h 127.0.0.1` med login | `pg_isready -h 127.0.0.1 -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"` | Samme TCP-regel som R4: imagets midlertidige init-server lytter kun på socket, så TCP lykkes først efter seed. `pg_isready` kræver intet password |
| Id'er | `INT UNSIGNED AUTO_INCREMENT` | `INTEGER GENERATED ALWAYS AS IDENTITY` | SQL-standard. Seed indsætter ingen id'er, så sekvensen passer |
| `UNSIGNED` | `INT/SMALLINT UNSIGNED` | `INTEGER/SMALLINT` + `CHECK (... >= 0)` | PostgreSQL har ikke `UNSIGNED` |
| Sæson og kategori | `ENUM(...)` | `TEXT` + `CHECK (season IN ('low','mid','high'))` | Simplere end `CREATE TYPE`, og værdierne er de samme i API'et |
| Pris | `DECIMAL(8,2)` | `NUMERIC(8,2)` | `pg` returnerer `NUMERIC` som tekst ligesom mysql2. Omregning til øre i R8 er uændret |
| Tegnsæt | `SET NAMES utf8mb4`, `utf8mb4_0900_ai_ci` | Databasen er UTF-8 som standard. Seed starter med `SET client_encoding = 'UTF8';` | "Müller" gemmes korrekt |
| Søgning (R9) | `LIKE` + accent-ufølsom kollation | `unaccent(...) ILIKE unaccent($1)` med `CREATE EXTENSION IF NOT EXISTS unaccent;` i skemaet | "muller" skal stadig finde 54 Müller (FR-010). `unaccent` følger med det officielle image, og init kører som ejeren |
| Tekst i seed (R3) | `generate-seed.js` fordobler `\` og `'` | Kun `'` fordobles | PostgreSQL bruger standard-SQL, hvor `\` ikke er escape-tegn. Kildedata har hverken `\` eller `'`, så de 1030 rækker bliver de samme |
| Pladsholdere | `?` | `$1, $2, ...` | Stadig parametre, aldrig brugerinput i SQL |
| Svar fra driveren | `const [rows] = await pool.query(...)`, `result.insertId`, `affectedRows` | `const { rows } = await pool.query(...)`, `INSERT ... RETURNING id`, `rowCount` | `pg`s API |
| Boolean | `is_historical` kommer som `0/1`, og `toBooking` tjekker `=== 1` | Kommer som `true/false`. `toBooking` skal ændres | **Vigtigt**: uden ændringen bliver alle historiske bookinger `false` og kan rettes og slettes (bryder FR-003) |
| Datoer (R8) | `dateStrings: true` | `types.setTypeParser` for `DATE` (OID 1082) og `TIMESTAMP` (OID 1114) returnerer teksten uændret | Samme regel som R8: ingen JS-`Date`, der kan flytte sig en dag |
| Tællinger og summer | `COUNT` som tal, `SUM` som tekst | `COUNT` og `SUM` er `bigint` og kommer som tekst. Repositories caster med `::int` | Services forventer tal. Alle summer (højst ca. 13,5 mio.) kan være i `int` |
| `sold_at` i dansk tid | `TZ=Europe/Copenhagen` på `db` | `TZ=Europe/Copenhagen` og `PGTZ=Europe/Copenhagen` på `db`, kolonnen er `TIMESTAMP` med `DEFAULT LOCALTIMESTAMP` | Kontrolleres i quickstart: et nyt salg skal have dansk tid |
| Fejlsøgning | `docker compose exec db mysql ...` | `docker compose exec db psql -U "$POSTGRES_USER" "$POSTGRES_DB"` | |

**Kontrol (SC-009)**: Efter skiftet køres quickstart trin 3–6 fra tom volumen. Tallene skal være
præcis de samme som med MySQL: 1000 bookinger, 30 drinks, samlet indtjening 11.234.034,
54 Müller ved søgning på "muller", baren 179.958 enheder og 13.448.640,34 DKK, kaffe/cocktail
52,83 / 47,17. De 55 unit-tests ændres ikke, da forretningslaget ikke kender databasen (R10).
