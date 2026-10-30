# Datamodel: Bookinger, nøgletal og barsalg

**Feature**: `001-booking-kpi-bar` | **Dato**: 2026-10-28 | **Plan**: [plan.md](plan.md)

MySQL 8.0, `utf8mb4` / `utf8mb4_0900_ai_ci`, InnoDB. Tabellerne oprettes i
`db-init/01-schema.sql` og fyldes i `db-init/02-seed.sql`. Der findes **ingen** tabeller eller
kolonner med færdigberegnede nøgletal (princip V).

```text
room_type 1 ──── * booking
drink     1 ──── * bar_sale
```

## room_type

| Kolonne | Type | Regler |
|---------|------|--------|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `name` | `VARCHAR(50) NOT NULL UNIQUE` | Præcis som i datafilen, fx `LOFT Suite` |
| `price_low` | `INT UNSIGNED NOT NULL` | DKK pr. nat, lavsæson |
| `price_mid` | `INT UNSIGNED NOT NULL` | DKK pr. nat, mellemsæson |
| `price_high` | `INT UNSIGNED NOT NULL` | DKK pr. nat, højsæson |

`CHECK (price_low <= price_mid AND price_mid <= price_high)`.

Seed: 8 rækker med priserne fra tabellen i FR-008. Typerne er Standard Single, Grand Lit,
Standard Double, Superior Double, Junior Suite, Spa Executive, Suite og LOFT Suite.

## booking

| Kolonne | Type | Regler |
|---------|------|--------|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `first_name` | `VARCHAR(100) NOT NULL` | Påkrævet, trimmet, ikke tom |
| `last_name` | `VARCHAR(100) NOT NULL` | Påkrævet, trimmet, ikke tom |
| `country` | `VARCHAR(100) NOT NULL` | Påkrævet, fri tekst (datafilen har 20 lande) |
| `room_type_id` | `INT UNSIGNED NOT NULL` FK → `room_type.id` | API'et bruger værelsestypens **navn**. Ukendt navn → 400 |
| `nights` | `SMALLINT UNSIGNED NOT NULL` | Heltal 1–365 (`CHECK (nights >= 1)`). Datafilens "Days Rented" |
| `season` | `ENUM('low','mid','high') NOT NULL` | Ny booking: udregnes. Historisk: fra filen |
| `total_price` | `INT UNSIGNED NOT NULL` | Hele DKK. Ny booking: pris pr. nat × nætter. Historisk: fra filen |
| `is_historical` | `BOOLEAN NOT NULL DEFAULT FALSE` | `TRUE` kun for de 1000 seed-rækker |
| `arrival_date` | `DATE NULL` | `NULL` for historiske, påkrævet for nye |
| `created_at` | `TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP` | Kun teknisk sporing |

Constraints og indeks:

- `CHECK ((is_historical = TRUE AND arrival_date IS NULL) OR (is_historical = FALSE AND arrival_date IS NOT NULL))`
  sikrer, at historiske bookinger aldrig får datoer (FR-003), og at nye altid har en (princip VI).
- `INDEX (last_name)`, `INDEX (first_name)` til søgning. `INDEX (arrival_date)` til belægning.

### Regler (forretningslaget, `services/bookingRules.js`)

**Sæson** (FR-007), alene ud fra ankomstdatoens måned:

| Måned | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|-------|---|---|---|---|---|---|---|---|---|----|----|----|
| Sæson | low | low | mid | mid | mid | high | high | high | mid | mid | low | high |

**Pris** (FR-008, FR-009): `total_price = room_type.price_<season> × nights`.

**Periode** (FR-006): Bookingen optager nætterne `arrival_date + i` for `i = 0 … nights−1`.
Afrejsedatoen gemmes ikke.

**Validering** (FR-004, FR-005). Alle fejl samles og returneres i én 400:

| Felt | Fejl |
|------|------|
| `first_name`, `last_name`, `country` | mangler, ikke tekst, tom efter trim eller > 100 tegn |
| `room_type` | mangler eller findes ikke i `room_type.name` |
| `arrival_date` | mangler, ikke `YYYY-MM-DD` eller ikke en rigtig dato (fx `2026-02-31`) |
| `nights` | mangler, ikke et heltal eller uden for 1–365 |
| `season`, `total_price`, `is_historical` | Ignoreres ved input. De kan ikke indtastes (princip VI) |

### Tilstande

```text
          POST                PUT (genberegn sæson+pris)
 (ingen) ──────▶ ny booking ◀─────────┐
                   │  └──────────────┘
                   │ DELETE
                   ▼
                (slettet, ingen historik)

 historisk booking (seed) ── PUT/DELETE ──▶ 409, uændret
```

## drink

| Kolonne | Type | Regler |
|---------|------|--------|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `name` | `VARCHAR(100) NOT NULL UNIQUE` | Fra datafilen |
| `category` | `ENUM('Coffee','Cocktail') NOT NULL` | Fra datafilen |
| `price` | `DECIMAL(8,2) NOT NULL` | DKK, afrundet til 2 decimaler (research R1) |
| `historical_units_sold` | `INT UNSIGNED NOT NULL DEFAULT 0` | Datafilens "Units Sold". Uden tidspunkt. Ændres aldrig |

Seed: 30 rækker (20 Cocktail, 10 Coffee). Menuen er fast, og der er ingen CRUD-endpoints for
drinks.

## bar_sale

| Kolonne | Type | Regler |
|---------|------|--------|
| `id` | `INT UNSIGNED AUTO_INCREMENT` PK | |
| `drink_id` | `INT UNSIGNED NOT NULL` FK → `drink.id` | Ukendt drink → 400 |
| `quantity` | `SMALLINT UNSIGNED NOT NULL` | Heltal 1–1000 (`CHECK (quantity >= 1)`). 0, negativ eller over 1000 → 400 |
| `sold_at` | `DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` | Sættes automatisk (FR-022) |

Ingen medarbejderkolonne (FR-023). Seed: 0 rækker. Historisk salg ligger kun som
`drink.historical_units_sold` (FR-003: der opdigtes ingen tidspunkter).

## Afledte værdier (beregnes ved hvert kald, gemmes aldrig)

| Nøgletal | Beregning (forretningslaget) | Kilde-rækker (datalaget) |
|----------|------------------------------|--------------------------|
| Samlet indtjening | Σ `booking.total_price` | alle bookinger |
| Indtjening pr. land / værelsestype / sæson | Σ `total_price` grupperet. Hver fordeling summerer til totalen | alle bookinger |
| Indtjening pr. værelsestype × sæson | Σ `total_price` pr. kombination. Alle 24 kombinationer kommer med, også med 0. Summerer til totalen | alle bookinger + alle værelsestyper |
| Belægning for nat D | antal bookinger med `arrival_date ≤ D < arrival_date + nights` ÷ 214 × 100 | bookinger med `arrival_date` |
| Enheder pr. drink | `historical_units_sold` + Σ `bar_sale.quantity` | drinks + summer af salg pr. drink |
| Omsætning pr. drink | enheder × `price` (regnes i øre) | som ovenfor |
| Barens total | Σ enheder og Σ omsætning over 30 drinks | som ovenfor |
| Kategorifordeling | omsætning pr. kategori ÷ total × 100 | som ovenfor |
| Mest solgte kaffe / cocktail | maks. enheder pr. kategori (alle ved uafgjort) | som ovenfor |

Datalaget må gerne bruge `SUM(...) GROUP BY drink_id` til at hente rå salgssummer pr. drink.
Det er dataadgang, ikke et nøgletal. Gruppering, procenter, belægning og omsætning ligger i
forretningslaget.
