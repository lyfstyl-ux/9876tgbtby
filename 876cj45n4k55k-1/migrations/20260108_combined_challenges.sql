-- Combined migration: create challenges table and apply ALTERs from Phase 1-3
-- Safe / idempotent: uses IF NOT EXISTS guards where appropriate

-- 0) Ensure extensions used by migrations exist (optional)
-- (uncomment if needed)
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create base 'challenges' table
CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  challenger TEXT NOT NULL,
  opponent TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'p2p',
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USDC',
  token_address TEXT,
  settlement_token TEXT,
  is_yes BOOLEAN DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active',
  yes_pool INTEGER DEFAULT 0,
  no_pool INTEGER DEFAULT 0,
  escrow_tx_hash TEXT,
  escrow_contract_id INTEGER,
  matcher_address TEXT,
  matched_tx_hash TEXT,
  matched_at TIMESTAMP,
  nft_tx_hash TEXT,
  nft_token_id INTEGER,
  source TEXT NOT NULL DEFAULT 'web',
  source_id TEXT,
  source_payload TEXT,
  is_automated BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2) Phase: add matched cols (safe)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matcher_address text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matched_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matched_at timestamp;

-- 3) Phase: add nft metadata cols (safe)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS nft_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS nft_token_id integer;

-- 4) Phase: add optional token & escrow + source columns (safe)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS token_address text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS escrow_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS escrow_contract_id integer;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS source_id text;

-- Create unique index for idempotency of webhooks
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_source_source_id_unique ON challenges (source, source_id);

-- 5) Add settlement token and index (safe)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS settlement_token TEXT;
CREATE INDEX IF NOT EXISTS idx_challenges_settlement_token ON challenges(settlement_token) WHERE settlement_token IS NOT NULL;

-- 6) Phase 3: stakes / matches / notifications
-- 6.1 Stakes table
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

CREATE INDEX IF NOT EXISTS idx_stakes_challenge_id ON stakes(challenge_id);
CREATE INDEX IF NOT EXISTS idx_stakes_username ON stakes(username);
CREATE INDEX IF NOT EXISTS idx_stakes_side ON stakes(challenge_id, side, matched, amount);
CREATE INDEX IF NOT EXISTS idx_stakes_source ON stakes(source, source_id);

-- 6.2 Matches table
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

CREATE INDEX IF NOT EXISTS idx_matches_challenge_id ON matches(challenge_id);
CREATE INDEX IF NOT EXISTS idx_matches_settled ON matches(settled);
CREATE INDEX IF NOT EXISTS idx_matches_escrow_id ON matches(escrow_id);

-- 6.3 Notifications table
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

CREATE INDEX IF NOT EXISTS idx_notifications_username ON notifications(username);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(username, read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 7) Ensure yes_pool/no_pool exist (some older deployments may not have them)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'yes_pool'
  ) THEN
    ALTER TABLE challenges ADD COLUMN yes_pool INTEGER DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'challenges' AND column_name = 'no_pool'
  ) THEN
    ALTER TABLE challenges ADD COLUMN no_pool INTEGER DEFAULT 0;
  END IF;
END $$;

-- 8) Trigger to update stakes.updated_at
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

-- 9) Final sanity checks (no-op queries to validate normal execution)
SELECT 'OK - combined challenges migration applied' AS status;
