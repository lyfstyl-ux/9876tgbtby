import { test, expect } from 'vitest';

if (!process.env.DATABASE_URL) {
  test.skip('database not configured - skipping migration check', () => {});
} else {
  test('migration: unique index on source + source_id exists', async () => {
    const { pool } = await import('./db');
    const res = await pool.query(
      "SELECT indexname FROM pg_indexes WHERE tablename = 'challenges' AND indexname = 'idx_challenges_source_source_id_unique'"
    );
    expect(res.rows.length).toBeGreaterThan(0);
  });
}
