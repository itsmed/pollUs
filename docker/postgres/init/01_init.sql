-- Bootstraps a fresh database container.
-- Creates the schema_migrations tracking table, runs the initial schema,
-- and marks migration 001 as applied so the migration script skips it.

CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS members (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(255) NOT NULL,
  state     VARCHAR(255) NOT NULL,
  district  VARCHAR(10),                   -- NULL for Senators
  role      VARCHAR(50)  NOT NULL,         -- 'Senator' | 'Representative'
  party     VARCHAR(100) NOT NULL,
  api_id    VARCHAR(255) NOT NULL UNIQUE,  -- Congress.gov bioguide ID
  photo_url TEXT                           -- Congress.gov member photo
);

CREATE TABLE IF NOT EXISTS bills (
  id                    SERIAL PRIMARY KEY,
  title                 VARCHAR(1000) NOT NULL,
  summary               TEXT,
  status                VARCHAR(100),
  introduced_date       DATE,
  api_id                VARCHAR(255) NOT NULL UNIQUE,  -- Congress.gov "{congress}/{type}/{number}"
  origin_chamber        VARCHAR(50),
  bill_type             VARCHAR(20),
  bill_number           VARCHAR(50),
  congress_number       INTEGER,
  latest_action_text    TEXT,
  latest_action_date    DATE,
  update_date           DATE,
  url                   TEXT
);

CREATE TABLE IF NOT EXISTS votes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id     INTEGER     NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  vote        VARCHAR(20) NOT NULL CHECK (vote IN ('Yea', 'Nay', 'Abstain')),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, bill_id)  -- one vote per user per bill
);

CREATE TABLE IF NOT EXISTS comments (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bill_id   INTEGER     NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  content   TEXT        NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mark applied migrations so the migrate script skips them on fresh containers
INSERT INTO schema_migrations (version) VALUES ('001_initial_schema'), ('002_add_members_photo_url'), ('003_expand_bills_table')
  ON CONFLICT (version) DO NOTHING;
