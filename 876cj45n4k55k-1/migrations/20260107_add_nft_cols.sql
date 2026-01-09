-- Migration: add nft metadata columns

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS nft_tx_hash text;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS nft_token_id integer;
