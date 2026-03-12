-- Migration 003: Expand bills table with Congress.gov API fields

ALTER TABLE bills
  ADD COLUMN IF NOT EXISTS origin_chamber      VARCHAR(50),
  ADD COLUMN IF NOT EXISTS bill_type           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bill_number         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS congress_number     INTEGER,
  ADD COLUMN IF NOT EXISTS latest_action_text  TEXT,
  ADD COLUMN IF NOT EXISTS latest_action_date  DATE,
  ADD COLUMN IF NOT EXISTS update_date         DATE,
  ADD COLUMN IF NOT EXISTS url                 TEXT;
