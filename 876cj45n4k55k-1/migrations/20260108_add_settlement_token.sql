-- Migration: add settlement_token column to challenges table

ALTER TABLE challenges 
ADD COLUMN settlement_token TEXT;

-- Create index for faster lookups on settlement token
CREATE INDEX IF NOT EXISTS idx_challenges_settlement_token ON challenges(settlement_token)
WHERE settlement_token IS NOT NULL;
