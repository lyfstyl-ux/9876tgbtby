import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from './routes';
import { Server } from 'http';
import { db } from './db';
import { creatorCoins, creatorCoinSettings } from '../shared/schema';

// Mock the storage and other modules if needed
vi.mock('./notifications', () => ({
  sendNotification: vi.fn(),
  subscribeSSE: vi.fn(),
}));

describe('Creator Coins Admin Routes', () => {
  let app: express.Application;
  let server: Server;

  beforeAll(async () => {
    // Clean up test data
    await db.delete(creatorCoinSettings);
    await db.delete(creatorCoins);

    app = express();
    app.use(express.json());

    // Create a minimal HTTP server
    server = new (await import('http')).Server(app);
    await registerRoutes(server, app as any);
  });

  afterAll(async () => {
    // Clean up after tests
    await db.delete(creatorCoinSettings);
    await db.delete(creatorCoins);
    if (server) {
      server.close();
    }
  });

  describe('GET /api/coins', () => {
    it('should list all active creator coins', async () => {
      // First add a test coin
      const res1 = await request(app)
        .post('/admin/coins')
        .send({
          name: 'TEST_COIN',
          contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          decimals: 18,
        });

      expect(res1.status).toBe(201);

      const res = await request(app).get('/api/coins');
      expect(res.status).toBe(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.some((c: any) => c.name === 'TEST_COIN')).toBe(true);
    });
  });

  describe('POST /admin/coins', () => {
    it('should add a new creator coin', async () => {
      const res = await request(app)
        .post('/admin/coins')
        .send({
          name: 'JAN',
          contractAddress: '0x1111111111111111111111111111111111111111',
          decimals: 18,
          dexAddress: '0x2222222222222222222222222222222222222222',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('JAN');
      expect(res.body.contractAddress).toBe('0x1111111111111111111111111111111111111111');
      expect(res.body.decimals).toBe(18);
      expect(res.body.isActive).toBe(true);
    });

    it('should reject duplicate coin addresses', async () => {
      const coin = {
        name: 'DEGEN',
        contractAddress: '0x3333333333333333333333333333333333333333',
        decimals: 18,
      };

      // Add first coin
      const res1 = await request(app).post('/admin/coins').send(coin);
      expect(res1.status).toBe(201);

      // Try to add duplicate
      const res2 = await request(app).post('/admin/coins').send(coin);
      expect(res2.status).toBe(400);
      expect(res2.body.message).toContain('already');
    });

    it('should validate contract address format', async () => {
      const res = await request(app)
        .post('/admin/coins')
        .send({
          name: 'BAD',
          contractAddress: 'not-a-valid-address',
          decimals: 18,
        });

      expect(res.status).toBe(400);
      expect(res.body.field).toBeDefined();
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/admin/coins')
        .send({
          contractAddress: '0x4444444444444444444444444444444444444444',
          // missing name and decimals
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /admin/creators/:handle/coin', () => {
    it('should enable creator coin mode for a creator', async () => {
      // First add a coin
      const coinRes = await request(app)
        .post('/admin/coins')
        .send({
          name: 'PHANTOM',
          contractAddress: '0x5555555555555555555555555555555555555555',
          decimals: 18,
        });

      const coin = coinRes.body;

      // Enable for creator
      const res = await request(app)
        .post('/admin/creators/alice/coin')
        .send({
          coinId: coin.id,
          isEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('alice');
      expect(res.body.creatorCoinId).toBe(coin.id);
      expect(res.body.isEnabled).toBe(true);
    });

    it('should reject invalid coin id', async () => {
      const res = await request(app)
        .post('/admin/creators/bob/coin')
        .send({
          coinId: 99999,
          isEnabled: true,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('not found');
    });

    it('should normalize handle format (@alice → alice)', async () => {
      const coinRes = await request(app)
        .post('/admin/coins')
        .send({
          name: 'HIGHER',
          contractAddress: '0x6666666666666666666666666666666666666666',
          decimals: 18,
        });

      const coin = coinRes.body;

      // Create with @charlie format
      const res = await request(app)
        .post('/admin/creators/@charlie/coin')
        .send({
          coinId: coin.id,
          isEnabled: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('charlie');
    });

    it('should update existing creator coin settings', async () => {
      const coin1Res = await request(app)
        .post('/admin/coins')
        .send({
          name: 'CHAD',
          contractAddress: '0x7777777777777777777777777777777777777777',
          decimals: 18,
        });

      const coin2Res = await request(app)
        .post('/admin/coins')
        .send({
          name: 'BASED',
          contractAddress: '0x8888888888888888888888888888888888888888',
          decimals: 18,
        });

      // Set initial
      const res1 = await request(app)
        .post('/admin/creators/diana/coin')
        .send({ coinId: coin1Res.body.id, isEnabled: true });
      expect(res1.status).toBe(200);
      expect(res1.body.creatorCoinId).toBe(coin1Res.body.id);

      // Update
      const res2 = await request(app)
        .post('/admin/creators/diana/coin')
        .send({ coinId: coin2Res.body.id, isEnabled: false });
      expect(res2.status).toBe(200);
      expect(res2.body.creatorCoinId).toBe(coin2Res.body.id);
      expect(res2.body.isEnabled).toBe(false);
    });
  });

  describe('GET /api/creators/:handle/coin', () => {
    it('should retrieve creator coin settings', async () => {
      // First set up a creator with a coin
      const coinRes = await request(app)
        .post('/admin/coins')
        .send({
          name: 'FETCH_TEST',
          contractAddress: '0x9999999999999999999999999999999999999999',
          decimals: 18,
        });

      const coin = coinRes.body;

      await request(app)
        .post('/admin/creators/eve/coin')
        .send({ coinId: coin.id, isEnabled: true });

      // Now fetch
      const res = await request(app)
        .get('/api/creators/eve/coin');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('eve');
      expect(res.body.creatorCoinId).toBe(coin.id);
    });

    it('should return 404 for creator without coin settings', async () => {
      const res = await request(app)
        .get('/api/creators/nonexistent_user_12345/coin');

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not configured');
    });

    it('should normalize handle format', async () => {
      // First set up with normalized handle
      const coinRes = await request(app)
        .post('/admin/coins')
        .send({
          name: 'NORM_TEST',
          contractAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab',
          decimals: 18,
        });

      const coin = coinRes.body;

      await request(app)
        .post('/admin/creators/frank/coin')
        .send({ coinId: coin.id, isEnabled: true });

      // Fetch with @frank format
      const res = await request(app)
        .get('/api/creators/@frank/coin');

      expect(res.status).toBe(200);
      expect(res.body.username).toBe('frank');
    });
  });
});
