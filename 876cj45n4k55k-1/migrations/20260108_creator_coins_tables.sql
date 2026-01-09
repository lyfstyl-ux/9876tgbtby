-- Migration: add creator coins whitelist and creator coin settings tables

CREATE TABLE IF NOT EXISTS creator_coins (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contract_address TEXT NOT NULL UNIQUE,
  decimals INTEGER NOT NULL,
  dex_address TEXT,
  chain_id INTEGER NOT NULL DEFAULT 8453,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creator_coin_settings (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  creator_coin_id INTEGER NOT NULL REFERENCES creator_coins(id),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_creator_coin_settings_username ON creator_coin_settings(username);
