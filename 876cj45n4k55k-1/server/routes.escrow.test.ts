import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes';
import * as storageModule from './storage';

async function setupApp() {
  const app = express();
  const http = createServer(app);
  app.use(express.json());
  await registerRoutes(http, app);
  return app;
}

describe('escrow route', () => {
  it('returns 404 if challenge not found', async () => {
    const app = await setupApp();
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenge').mockResolvedValue(undefined);
    const res = await request(app).post('/api/challenges/123/escrow').send({ txHash: '0xabc' });
    expect(res.status).toBe(404);
    spyGet.mockRestore();
  });

  it('updates the challenge on success', async () => {
    const app = await setupApp();
    const fakeChallenge = { id: 123, challenger: '@a', opponent: '@b', name: 'test', amount: 1000, currency: 'USDC' } as any;
    const spyGet = vi.spyOn(storageModule.storage as any, 'getChallenge').mockResolvedValue(fakeChallenge as any);
    const spyUpdate = vi.spyOn(storageModule.storage as any, 'updateChallenge').mockResolvedValue({ ...fakeChallenge, status: 'escrowed', escrowTxHash: '0xabc' } as any);

    const res = await request(app).post('/api/challenges/123/escrow').send({ txHash: '0xabc', escrowId: 1, tokenAddress: '0xTOKEN' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('escrowed');
    expect(res.body.escrowTxHash).toBe('0xabc');

    spyGet.mockRestore();
    spyUpdate.mockRestore();
  });
});
