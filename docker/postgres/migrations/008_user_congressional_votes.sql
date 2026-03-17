-- Migration 008: User votes on congressional roll-call votes
--
-- Stores the position a user cast on a congressional vote (Yea/Nay/Abstain).
-- One row per (user, congressional_vote) pair; re-voting upserts the position.
-- Used to compute agreement/disagreement rates against a rep's voting record
-- on the rep detail page.

CREATE TABLE IF NOT EXISTS user_congressional_votes (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  congressional_vote_id INTEGER       NOT NULL REFERENCES congressional_votes(id) ON DELETE CASCADE,
  position              VARCHAR(20)   NOT NULL CHECK (position IN ('Yea', 'Nay', 'Abstain')),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, congressional_vote_id)
);

CREATE INDEX IF NOT EXISTS user_congressional_votes_user_id_idx
  ON user_congressional_votes (user_id);

CREATE INDEX IF NOT EXISTS user_congressional_votes_congressional_vote_id_idx
  ON user_congressional_votes (congressional_vote_id);
