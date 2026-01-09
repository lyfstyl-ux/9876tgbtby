-- Migration: add optional token and escrow columns and unique index on (source, source_id)
-- Note: remove duplicates before applying to avoid unique index creation failure.

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS token_address text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS escrow_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS escrow_contract_id integer;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS source_id text;

-- Create a unique index to guarantee idempotent processing of webhooks
CREATE UNIQUE INDEX IF NOT EXISTS idx_challenges_source_source_id_unique ON challenges (source, source_id);
