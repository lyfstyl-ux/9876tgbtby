import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseStorage, storage } from './storage';

describe('DatabaseStorage.createChallengeIfNotExists', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns existing challenge if found by source', async () => {
    const fake = { id: 1, source: 'farcaster', sourceId: 'c-1' } as any;
    const spyGet = vi.spyOn(DatabaseStorage.prototype as any, 'getChallengeBySource').mockResolvedValue(fake);
    const created = await storage.createChallengeIfNotExists({} as any);
    expect(created).toBe(fake);
    expect(spyGet).toHaveBeenCalled();
  });

  it('calls createChallenge when none exists', async () => {
    const newCh = { id: 2 } as any;
    const spyGet = vi.spyOn(DatabaseStorage.prototype as any, 'getChallengeBySource').mockResolvedValue(undefined);
    const spyCreate = vi.spyOn(DatabaseStorage.prototype as any, 'createChallenge').mockResolvedValue(newCh);

    const result = await storage.createChallengeIfNotExists({ source: 'farcaster', sourceId: 'c-2' } as any);
    expect(result).toBe(newCh);
    expect(spyGet).toHaveBeenCalled();
    expect(spyCreate).toHaveBeenCalled();
  });
});
