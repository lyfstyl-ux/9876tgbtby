-- Phase 3: Acceptance & Matching Migration
-- Date: 2026-01-08
-- Description: Add stakes, matches, and notifications tables for challenge acceptance and auto-matching

-- 1. Create stakes table (individual stakes on YES/NO sides)
CREATE TABLE IF NOT EXISTS stakes (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount INTEGER NOT NULL,
  escrow_id INTEGER,
  escrow_tx_hash TEXT,
  escrow_address TEXT,
  matched BOOLEAN DEFAULT FALSE,
  matched_with TEXT,
  settled BOOLEAN DEFAULT FALSE,
  winner BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'web',
  source_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_stakes_challenge_id ON stakes(challenge_id);
CREATE INDEX IF NOT EXISTS idx_stakes_username ON stakes(username);
CREATE INDEX IF NOT EXISTS idx_stakes_side ON stakes(challenge_id, side, matched, amount);
CREATE INDEX IF NOT EXISTS idx_stakes_source ON stakes(source, source_id);

-- 2. Create matches table (pairs of matched stakes)
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  yes_stake_id INTEGER NOT NULL REFERENCES stakes(id) ON DELETE CASCADE,
  no_stake_id INTEGER NOT NULL REFERENCES stakes(id) ON DELETE CASCADE,
  escrow_id INTEGER,
  escrow_tx_hash TEXT,
  settled BOOLEAN DEFAULT FALSE,
  winner TEXT,
  settlement_tx_hash TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  settled_at TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_matches_challenge_id ON matches(challenge_id);
CREATE INDEX IF NOT EXISTS idx_matches_settled ON matches(settled);
CREATE INDEX IF NOT EXISTS idx_matches_escrow_id ON matches(escrow_id);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  type TEXT NOT NULL,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  match_id INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  stake_id INTEGER REFERENCES stakes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_username ON notifications(username);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(username, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 4. Update challenges table (add if not exists)
-- These columns may already exist from Phase 2, so we check first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'yes_pool'
  ) THEN
    ALTER TABLE challenges ADD COLUMN yes_pool INTEGER DEFAULT 0;
    ALTER TABLE challenges ADD COLUMN no_pool INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'challenges' AND column_name = 'matched_at'
  ) THEN
    ALTER TABLE challenges ADD COLUMN matched_at TIMESTAMP;
  END IF;
END $$;

-- 5. Create trigger to auto-update stakes.updated_at
CREATE OR REPLACE FUNCTION update_stakes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stakes_timestamp ON stakes;
CREATE TRIGGER stakes_timestamp
BEFORE UPDATE ON stakes
FOR EACH ROW
EXECUTE FUNCTION update_stakes_timestamp();
