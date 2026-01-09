import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from './db';
import { creatorCoins, creatorCoinSettings } from '../shared/schema';
import { storage } from './storage';

describe('Creator Coins Storage', () => {
  const testCoin = {
    name: 'JAN',
    contractAddress: '0x1234567890123456789012345678901234567890',
    decimals: 18,
    dexAddress: '0x0987654321098765432109876543210987654321',
    chainId: 8453,
  };

  beforeAll(async () => {
    // Clean up test data
    await db.delete(creatorCoinSettings);
    await db.delete(creatorCoins);
  });

  afterAll(async () => {
    // Clean up after tests
    await db.delete(creatorCoinSettings);
    await db.delete(creatorCoins);
  });

  it('should add a creator coin', async () => {
    const coin = await storage.addCreatorCoin(testCoin);
    expect(coin).toBeDefined();
    expect(coin.name).toBe('JAN');
    expect(coin.contractAddress).toBe(testCoin.contractAddress);
    expect(coin.decimals).toBe(18);
    expect(coin.isActive).toBe(true);
  });

  it('should retrieve a creator coin by contract address', async () => {
    await storage.addCreatorCoin(testCoin);
    const coin = await storage.getCreatorCoin(testCoin.contractAddress);
    expect(coin).toBeDefined();
    expect(coin?.name).toBe('JAN');
  });

  it('should list all active creator coins', async () => {
    const degen = {
      name: 'DEGEN',
      contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      decimals: 18,
      chainId: 8453,
    };

    await storage.addCreatorCoin(degen);
    const coins = await storage.listCreatorCoins();
    expect(coins.length).toBeGreaterThanOrEqual(2);
    expect(coins.some(c => c.name === 'JAN')).toBe(true);
    expect(coins.some(c => c.name === 'DEGEN')).toBe(true);
  });

  it('should set creator coin settings', async () => {
    const coin = await storage.addCreatorCoin({
      name: 'BASED',
      contractAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      decimals: 18,
      chainId: 8453,
    });

    const settings = await storage.setCreatorCoinSettings('alice', coin.id, true);
    expect(settings).toBeDefined();
    expect(settings.username).toBe('alice');
    expect(settings.creatorCoinId).toBe(coin.id);
    expect(settings.isEnabled).toBe(true);
  });

  it('should update existing creator coin settings', async () => {
    const coin = await storage.addCreatorCoin({
      name: 'PHANTOM',
      contractAddress: '0xcccccccccccccccccccccccccccccccccccccccc',
      decimals: 18,
      chainId: 8453,
    });

    const coin2 = await storage.addCreatorCoin({
      name: 'HIGHER',
      contractAddress: '0xdddddddddddddddddddddddddddddddddddddddd',
      decimals: 18,
      chainId: 8453,
    });

    // Set initial settings
    await storage.setCreatorCoinSettings('bob', coin.id, true);

    // Update to different coin
    const updated = await storage.setCreatorCoinSettings('bob', coin2.id, false);
    expect(updated.creatorCoinId).toBe(coin2.id);
    expect(updated.isEnabled).toBe(false);
  });

  it('should retrieve creator coin settings', async () => {
    const coin = await storage.addCreatorCoin({
      name: 'CHAD',
      contractAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      decimals: 18,
      chainId: 8453,
    });

    await storage.setCreatorCoinSettings('charlie', coin.id, true);
    const settings = await storage.getCreatorCoinSettings('charlie');
    expect(settings).toBeDefined();
    expect(settings?.username).toBe('charlie');
    expect(settings?.creatorCoinId).toBe(coin.id);
  });

  it('should return undefined for non-existent creator settings', async () => {
    const settings = await storage.getCreatorCoinSettings('nonexistent_user_12345');
    expect(settings).toBeUndefined();
  });
});
