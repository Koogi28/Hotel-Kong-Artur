# db-init

Init-scripts til PostgreSQL-containeren (`db` i `compose.yaml`). Mappen monteres som
`/docker-entrypoint-initdb.d` i `postgres:16-alpine`-imaget.

- Filerne køres i alfabetisk rækkefølge og **kun når volumen `pg_data` er tom** (første
  opstart). Ændringer her kræver derfor `docker compose down -v && docker compose up -d`.
  `-v` sletter også oprettede bookinger og barsalg.
- `01-schema.sql`: tabeller, constraints og extensionen `unaccent` (research R11).
- `02-seed.sql`: **genereret** startdata (8 værelsestyper, 1000 bookinger, 30 drinks). Ret ikke
  i hånden. Genskab den med `node scripts/generate-seed.js` fra repo-roden (research R3).
- Denne README ignoreres af containeren (kun `.sql` og `.sh` køres).

Fejlsøgning i databasen:

```bash
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```
