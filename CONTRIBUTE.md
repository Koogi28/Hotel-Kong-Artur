# Sådan bidrager du

Regler og arbejdsgang for gruppen bag Hotel Kong Arthur-projektet. Reglerne bygger på
[konstitutionen](.specify/memory/constitution.md), som går forud for alt andet. Se
[README](README.md) for, hvad systemet gør, og hvordan det startes.

## Gruppen

| Navn | Git-navne i historikken |
|------|-------------------------|
| Pin Yuan L. | `K`, `K-Workstation`, `Pin Linux` (og to tidlige commits under fuldt navn) |
| Oliver F.K. | `koogi28` (ejer af GitHub-repoet `Koogi28/Hotel-Kong-Artur`) |
| Hjalte-Emil H. | `Hjalte-Emil` |
| Mathias H.B. | `MathiasHB-git` |
| Sofia R.Z. | `sorozi` |

## 1. Opsætning

Kræver Git og Docker Desktop (Compose v2.20+). Node 20+ lokalt er kun nødvendigt, hvis du vil køre
unit-tests uden for Docker.

```bash
git clone https://github.com/Koogi28/Hotel-Kong-Artur.git
cd Hotel-Kong-Artur

# 1. Hemmeligheder: .env er i .gitignore og må aldrig committes (konstitution XII)
cp .env.example .env            # udfyld POSTGRES_PASSWORD (og evt. POSTGRES_USER/POSTGRES_DB)

# 2. Spec Kit: fortæl kommandoerne, hvilken feature vi arbejder på (filen er ikke i Git)
echo '{"feature_directory": "specs/001-booking-kpi-bar"}' > .specify/feature.json

# 3. Start systemet (db + backend)
docker compose up -d --build
curl -s localhost:3000/api/health   # → {"status":"ok"}
```

- **Fra MySQL til PostgreSQL (uge 2)**: Har du en gammel `.env` med `MYSQL_*`, så erstat dem med
  `POSTGRES_DB`, `POSTGRES_USER` og `POSTGRES_PASSWORD` fra `.env.example`, og start på en tom volumen
  med `docker compose down -v && docker compose up -d --build`.
- **Tilbage til startdata**: `docker compose down -v && docker compose up -d`. Det sletter alle
  nye bookinger og barsalg.
- **Efter kodeændringer** i `backend/` (også `backend/public/`): `docker compose up -d --build backend`
  og Ctrl + F5 i browseren, fordi filerne er bagt ind i imaget.
- **Dev-container** med Spec Kit og Claude Code: `docker compose --profile dev up -d app` og
  `docker compose exec app bash`.

## 2. Sådan arbejder vi: peer coding med AI

Vi koder sammen i **online sessioner med skærmdeling** i stedet for at sidde hver for sig med
hver sin AI. Det holder AI-forbruget nede, fordi der kun kører **én AI-session (Claude Code) ad
gangen**, og alle i gruppen ser og forstår koden, når den bliver skrevet (konstitution XI).

| Rolle | Hvem | Opgave |
|-------|------|--------|
| **Driver** | Skifter fra session til session | Deler skærm, styrer Claude Code og terminalen, committer og pusher under eget git-navn |
| **Navigatører** | Resten af gruppen | Følger med på skærmen, holder øje med spec, konstitution og styleguide, stiller spørgsmål og godkender hver task, før driveren går videre |

Sådan forløber en session:

1. Driveren henter den nyeste kode (`git pull`) og laver eller skifter til sessionens branch.
2. Gruppen vælger næste task i [`tasks.md`](specs/001-booking-kpi-bar/tasks.md) sammen.
3. Driveren giver AI'en **én task ad gangen** (`/speckit-implement` eller en konkret opgave).
4. **Stop efter hver task**: AI'en forklarer, hvad den har ændret og hvorfor, og gruppen
   gennemgår ændringen live. Den committes først, når gruppen er enig (live review).
5. Til sidst pusher driveren og opretter en pull request (se nedenfor).

Når driveren skifter, pusher den gamle driver sit arbejde først, så den nye kan fortsætte fra
samme branch.

## 3. Branches, commits og pull requests

### Branches

- `main` er altid den version, der virker og kan vises. Der committes **aldrig** direkte på `main`.
- Lav én branch pr. dag eller feature fra den nyeste `main`, med et dansk navn, der siger hvad
  den indeholder, fx `dag5-noegletal`, `uge2-postgres-og-noegletal` eller
  `uge2-frontend-styleguide`.
- Bygger en branch på en anden, der ikke er merget endnu, så skriv det i pull requesten.
- Vigtige versioner tagges, fx `uge1-mysql` (uge 1 med MySQL, før databaseskiftet).

```bash
git checkout main && git pull
git checkout -b uge2-min-feature
```

### Commits

- **Én task pr. commit**, når det er muligt. Beskeden starter med task-ID'et og siger på dansk,
  hvad der er lavet, fx `T063: bookingRepository til pg ($n, RETURNING, unaccent-søgning)`.
- **Kontrakt og kode i samme commit**: ændres et endpoint, opdateres
  `specs/001-booking-kpi-bar/contracts/openapi.yaml` i samme commit (konstitution IV).
- **Marker tasken** med `[X]` i `specs/001-booking-kpi-bar/tasks.md` i samme commit som koden.
- **Ingen hemmeligheder** (`.env`, passwords) og ingen `node_modules/` i commits (konstitution XII).
- **Driveren committer under eget git-navn**, også når hele gruppen har været med i sessionen.
  Er koden skrevet af AI, tilføjes en `Co-Authored-By`-linje, så det er tydeligt (konstitution XI).
- En task committes først, når gruppen har gennemgået den live (se afsnit 2).

### Pull requests og review

Koden bliver gennemgået **to gange**: live under sessionen (efter hver task) og samlet i pull
requesten, før den kommer på `main`.

1. Driveren pusher branchen: `git push -u origin uge2-min-feature`.
2. Driveren opretter en pull request mod `main` på GitHub og beskriver kort, hvilke tasks der er
   lavet, og hvordan de er testet.
3. **Et andet gruppemedlem end driveren godkender pull requesten** på GitHub, før den merges
   (konstitution XI). Reviewer ser hele ændringen samlet og tjekker mod konstitutionens
   [Kvalitetsporte](.specify/memory/constitution.md#kvalitetsporte), bl.a.:
   - Ligger SQL kun i `repositories/` og beregninger kun i `services/`? (II)
   - Er `openapi.yaml` opdateret, og bruger nye endpoints rigtige metoder og statuskoder? (III, IV)
   - Beregnes nøgletal i API'et ved hvert kald, og beregner frontenden intet selv? (IV, V)
   - Er der tests for ny beregning af sæson, pris eller nøgletal? (XII)
   - Starter systemet stadig med `docker compose up`? (IX)
   - Følger frontenden [styleguiden](styleguide/style.md) og tokens i research R12?
   - Er der ingen hemmeligheder i de ændrede filer? (XII)
4. Når reviewer har godkendt, merges pull requesten, og branchen kan slettes.

## 4. Spec Kit: spec først, så kode

Vi bruger [Spec Kit](https://github.com/github/spec-kit) i denne rækkefølge (konstitution X).
**Der må ikke skrives kode, før der findes en task til den.**

| Trin | Kommando | Resultat i `specs/001-booking-kpi-bar/` |
|------|----------|------------------------------------------|
| 1. Specify | `/speckit-specify` | `spec.md`: user stories, krav (FR) og succeskriterier (SC) |
| 2. Clarify (valgfri) | `/speckit-clarify` | Afklaringer skrives ind i `spec.md` |
| 3. Plan | `/speckit-plan` | `plan.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md` |
| 4. Tasks | `/speckit-tasks` | `tasks.md`: opgaver i rækkefølge med afhængigheder |
| 5. Analyze | `/speckit-analyze` | Tjek af spec, plan og tasks mod hinanden og konstitutionen (ændrer intet) |
| 6. Implement | `/speckit-implement` | Koden, **én task ad gangen**, med stop til review efter hver |
| 7. Converge | `/speckit-converge` | Hvad er bygget, og hvad mangler. Resultatet skrives i `converge.md` |

- **Nye ønsker** (fx fra hotellet eller gruppen) skrives først ind i `spec.md` som krav, derefter i
  plan og tasks, og først så kodes de.
- **Konstitutionen** ændres kun efter aftale i gruppen og med `/speckit-constitution`, så version og
  dato opdateres.
- [`HANDOFF.md`](specs/001-booking-kpi-bar/HANDOFF.md) beskriver status og næste skridt for den,
  der tager over.

## 5. Kode og tekst

- Dokumenter og kommentarer er på **dansk**; navne i koden (variabler, funktioner, filer) er på
  **engelsk**.
- Backenden har tre lag: `controllers/` (HTTP) → `services/` (regler og beregninger) →
  `repositories/` (SQL). Et lag kalder kun laget lige under sig (konstitution II).
- Nye biblioteker kræver en begrundelse i `plan.md` (konstitution I). I dag er der fire:
  `express`, `pg`, `swagger-ui-express` og `yaml`.
- Frontenden er ren HTML, CSS og JavaScript i `backend/public/`, uden framework og build-step. Al
  styling ligger i `css/style.css` med farver og skrifter fra tokens i `:root`. Alle data hentes
  med `fetch` via `js/api.js`.

## 6. Før driveren åbner en pull request

```bash
cd backend && npm test        # eller: docker compose run --rm --no-deps backend npm test
```

- Kør de relevante trin i [quickstart](specs/001-booking-kpi-bar/quickstart.md) mod den kørende
  stack, fx trin 4–6 for API'et og trin 9 for frontenden.
- Har du ændret frontenden, så tjek siden ved 375 px bredde (ingen vandret scroll) og med
  Tab-tasten (synligt fokus).
