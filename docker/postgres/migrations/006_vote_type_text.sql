-- Migration 006: Widen congressional_votes.type to TEXT
--
-- Some Senate procedural votes (e.g. bulk "Motion to Reconsider" with dozens
-- of nomination numbers) produce type strings that exceed VARCHAR(255).

ALTER TABLE congressional_votes
  ALTER COLUMN type TYPE TEXT;
