-- Migration 004: Add user profile fields and saved members

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS address     TEXT,
  ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS user_saved_members (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  saved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, member_id)
);

-- Seed the local dev user (idempotent)
INSERT INTO users (name, email) VALUES ('Dev User', 'dev@local.dev')
  ON CONFLICT (email) DO NOTHING;
