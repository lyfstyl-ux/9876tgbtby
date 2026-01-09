import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import * as storageModule from '../storage';
import { registerRoutes } from '../routes';

const fakeChallenge = {
  id: 999,
  challenger: '@tester',
  opponent: '@jack',
  name: 'TEST CHALLENGE',
  amount: 5000,
  currency: 'USDC',
  sourceId: 'cast-1',
  sourcePayload: '{}',
  isAutomated: true,
  createdAt: new Date().toISOString(),
};

async function setupApp() {
  const app = express();
  const http = createServer(app);
  app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  await registerRoutes(http, app);
  return app;
}

describe('webhook create flow', () => {
  beforeEach(() => {
    // reset spies
    vi.restoreAllMocks();
  });

  it('creates a new challenge from farcaster tag when signature is valid', async () => {
    process.env.FARCASTER_WEBHOOK_SECRET = 'test-secret';

    const spyGetBySource = vi.spyOn(storageModule.storage as any, 'getChallengeBySource').mockResolvedValue(undefined);
    const spyCreate = vi.spyOn(storageModule.storage as any, 'createChallengeIfNotExists').mockResolvedValue(fakeChallenge as any);

    const app = await setupApp();

    const payload = { castId: 'cast-1', author: 'tester', text: '@bantabro challenge "TEST CHALLENGE" @jack YES 5,000 USDC' };
    const raw = JSON.stringify(payload);
    const { createHmac } = await import('crypto');
    const sig = 'sha256=' + createHmac('sha256', process.env.FARCASTER_WEBHOOK_SECRET!).update(raw).digest('hex');

    const res = await request(app)
      .post('/webhooks/farcaster')
      .set('x-bantabro-signature', sig)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(fakeChallenge.id);
    expect(spyGetBySource).toHaveBeenCalled();
    expect(spyCreate).toHaveBeenCalled();
  });

  it('rejects farcaster webhook with missing/invalid signature', async () => {
    process.env.FARCASTER_WEBHOOK_SECRET = 'test-secret';

    const app = await setupApp();

    const payload = { castId: 'cast-2', author: 'tester', text: '@bantabro challenge "TEST CHALLENGE" @jack YES ₦5,000' };

    // no signature header
    const res = await request(app)
      .post('/webhooks/farcaster')
      .send(payload);

    expect(res.status).toBe(401);
  });
});
