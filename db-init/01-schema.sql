-- Skema for Hotel Kong Arthur (specs/001-booking-kpi-bar/data-model.md, research R11).
-- Køres automatisk af PostgreSQL-containeren ved første opstart (kun når volumen er tom).
-- Der gemmes ingen færdigberegnede nøgletal (konstitution V).

-- unaccent gør søgningen accent-ufølsom, så "muller" finder "Müller" (FR-010).
-- Init-scripts køres som POSTGRES_USER, der ejer databasen og må oprette extensionen.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE room_type (
  id         INTEGER     GENERATED ALWAYS AS IDENTITY,
  name       VARCHAR(50) NOT NULL,
  price_low  INTEGER     NOT NULL,  -- DKK pr. nat, lavsæson
  price_mid  INTEGER     NOT NULL,  -- DKK pr. nat, mellemsæson
  price_high INTEGER     NOT NULL,  -- DKK pr. nat, højsæson
  CONSTRAINT pk_room_type PRIMARY KEY (id),
  CONSTRAINT uq_room_type_name UNIQUE (name),
  CONSTRAINT chk_room_type_price_low CHECK (price_low >= 0),
  CONSTRAINT chk_room_type_prices CHECK (price_low <= price_mid AND price_mid <= price_high)
);

CREATE TABLE booking (
  id            INTEGER      GENERATED ALWAYS AS IDENTITY,
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  country       VARCHAR(100) NOT NULL,
  room_type_id  INTEGER      NOT NULL,
  nights        SMALLINT     NOT NULL,
  season        TEXT         NOT NULL,
  total_price   INTEGER      NOT NULL,  -- hele DKK for hele opholdet
  is_historical BOOLEAN      NOT NULL DEFAULT FALSE,
  arrival_date  DATE         NULL,      -- NULL for historiske bookinger
  created_at    TIMESTAMP(0) NOT NULL DEFAULT LOCALTIMESTAMP(0),
  CONSTRAINT pk_booking PRIMARY KEY (id),
  CONSTRAINT fk_booking_room_type FOREIGN KEY (room_type_id) REFERENCES room_type (id),
  CONSTRAINT chk_booking_nights CHECK (nights >= 1),
  CONSTRAINT chk_booking_season CHECK (season IN ('low', 'mid', 'high')),
  CONSTRAINT chk_booking_total_price CHECK (total_price >= 0),
  -- Historiske bookinger har aldrig dato, nye har altid dato (FR-003, konstitution VI)
  CONSTRAINT chk_booking_arrival CHECK (
    (is_historical = TRUE AND arrival_date IS NULL)
    OR (is_historical = FALSE AND arrival_date IS NOT NULL)
  )
);

CREATE INDEX idx_booking_last_name ON booking (last_name);
CREATE INDEX idx_booking_first_name ON booking (first_name);
CREATE INDEX idx_booking_arrival_date ON booking (arrival_date);

CREATE TABLE drink (
  id                    INTEGER      GENERATED ALWAYS AS IDENTITY,
  name                  VARCHAR(100) NOT NULL,
  category              TEXT         NOT NULL,
  price                 NUMERIC(8,2) NOT NULL,            -- DKK
  historical_units_sold INTEGER      NOT NULL DEFAULT 0,  -- "Units Sold" fra datafilen
  CONSTRAINT pk_drink PRIMARY KEY (id),
  CONSTRAINT uq_drink_name UNIQUE (name),
  CONSTRAINT chk_drink_category CHECK (category IN ('Coffee', 'Cocktail')),
  CONSTRAINT chk_drink_price CHECK (price >= 0),
  CONSTRAINT chk_drink_historical_units_sold CHECK (historical_units_sold >= 0)
);

CREATE TABLE bar_sale (
  id       INTEGER      GENERATED ALWAYS AS IDENTITY,
  drink_id INTEGER      NOT NULL,
  quantity SMALLINT     NOT NULL,
  -- Hele sekunder i dansk tid (forbindelsens tidszone sættes i backend/src/db.js), så
  -- formatet passer til kontraktens 'YYYY-MM-DD HH:MM:SS' (research R11)
  sold_at  TIMESTAMP(0) NOT NULL DEFAULT LOCALTIMESTAMP(0),
  CONSTRAINT pk_bar_sale PRIMARY KEY (id),
  CONSTRAINT fk_bar_sale_drink FOREIGN KEY (drink_id) REFERENCES drink (id),
  CONSTRAINT chk_bar_sale_quantity CHECK (quantity >= 1)
);
