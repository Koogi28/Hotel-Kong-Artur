-- Skema for Hotel Kong Arthur (specs/001-booking-kpi-bar/data-model.md).
-- Køres automatisk af MySQL-containeren ved første opstart (tom volumen).
-- Der gemmes ingen færdigberegnede nøgletal (konstitution V).

SET NAMES utf8mb4;

CREATE TABLE room_type (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50)  NOT NULL,
  price_low  INT UNSIGNED NOT NULL,  -- DKK pr. nat, lavsæson
  price_mid  INT UNSIGNED NOT NULL,  -- DKK pr. nat, mellemsæson
  price_high INT UNSIGNED NOT NULL,  -- DKK pr. nat, højsæson
  PRIMARY KEY (id),
  UNIQUE KEY uq_room_type_name (name),
  CONSTRAINT chk_room_type_prices CHECK (price_low <= price_mid AND price_mid <= price_high)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE booking (
  id            INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  first_name    VARCHAR(100)      NOT NULL,
  last_name     VARCHAR(100)      NOT NULL,
  country       VARCHAR(100)      NOT NULL,
  room_type_id  INT UNSIGNED      NOT NULL,
  nights        SMALLINT UNSIGNED NOT NULL,
  season        ENUM('low','mid','high') NOT NULL,
  total_price   INT UNSIGNED      NOT NULL,  -- hele DKK for hele opholdet
  is_historical BOOLEAN           NOT NULL DEFAULT FALSE,
  arrival_date  DATE              NULL,      -- NULL for historiske bookinger
  created_at    TIMESTAMP         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_booking_last_name (last_name),
  KEY idx_booking_first_name (first_name),
  KEY idx_booking_arrival_date (arrival_date),
  CONSTRAINT fk_booking_room_type FOREIGN KEY (room_type_id) REFERENCES room_type (id),
  CONSTRAINT chk_booking_nights CHECK (nights >= 1),
  -- Historiske bookinger har aldrig dato, nye har altid dato (FR-003, konstitution VI)
  CONSTRAINT chk_booking_arrival CHECK (
    (is_historical = TRUE AND arrival_date IS NULL)
    OR (is_historical = FALSE AND arrival_date IS NOT NULL)
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE drink (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                  VARCHAR(100) NOT NULL,
  category              ENUM('Coffee','Cocktail') NOT NULL,
  price                 DECIMAL(8,2) NOT NULL,             -- DKK
  historical_units_sold INT UNSIGNED NOT NULL DEFAULT 0,   -- "Units Sold" fra datafilen
  PRIMARY KEY (id),
  UNIQUE KEY uq_drink_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bar_sale (
  id       INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  drink_id INT UNSIGNED      NOT NULL,
  quantity SMALLINT UNSIGNED NOT NULL,
  sold_at  DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bar_sale_drink FOREIGN KEY (drink_id) REFERENCES drink (id),
  CONSTRAINT chk_bar_sale_quantity CHECK (quantity >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
