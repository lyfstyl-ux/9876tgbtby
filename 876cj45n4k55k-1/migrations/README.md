# Database migrations

This project uses `drizzle-kit` for migrations. Migrations are stored in the `migrations/` folder and can be applied with:

```bash
npm run db:push
```

Important:
- The migration `20260107_add_unique_source_sourceid.sql` adds a unique index on `(source, source_id)` to enforce idempotency for webhooks. If your production DB already has duplicates, the migration may fail; remove or dedupe existing duplicates first or create the index concurrently:

```sql
CREATE UNIQUE INDEX CONCURRENTLY idx_challenges_source_source_id_unique ON challenges (source, source_id) WHERE source IS NOT NULL AND source_id IS NOT NULL;
```

- Migrations also add optional columns used for on-chain escrow tracking: `token_address`, `escrow_tx_hash`, and `escrow_contract_id`.

Testing:
- There is a small test `server/storage.migration.test.ts` that checks for the presence of the migration index, but it requires `DATABASE_URL` to be set and will be skipped otherwise.
