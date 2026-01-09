-- Migration: add matched cols for accept/decline flow

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matcher_address text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matched_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS matched_at timestamp;
