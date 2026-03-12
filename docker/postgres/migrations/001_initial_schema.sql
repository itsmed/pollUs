-- Migration 001: Initial schema for PollUs

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
  api_id    VARCHAR(255) NOT NULL UNIQUE   -- Congress.gov bioguide ID
);

CREATE TABLE IF NOT EXISTS bills (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(1000) NOT NULL,
  summary           TEXT,
  status            VARCHAR(100),
  introduced_date   DATE,
  api_id            VARCHAR(255) NOT NULL UNIQUE  -- Congress.gov bill ID
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
