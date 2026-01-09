import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { verifyWebhook } from './verify';

async function setupApp(secretEnvName: string, platform: 'farcaster' | 'base') {
  process.env[secretEnvName] = 'abc123';
  const app = express();
  app.use(express.json({ verify: (req: any, _res, buf) => { req.rawBody = buf; } }));
  app.post('/test', verifyWebhook(platform), (req, res) => res.json({ ok: true }));
  return app;
}

import { createHmac } from 'crypto';

describe('verifyWebhook middleware', () => {
  it('accepts valid signature', async () => {
    const app = await setupApp('FARCASTER_WEBHOOK_SECRET', 'farcaster');
    const payload = { a: 1 };
    const raw = JSON.stringify(payload);
    const sig = 'sha256=' + createHmac('sha256', 'abc123').update(raw).digest('hex');

    const res = await request(app).post('/test').set('x-bantabro-signature', sig).send(payload);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects invalid signature', async () => {
    const app = await setupApp('FARCASTER_WEBHOOK_SECRET', 'farcaster');
    const payload = { a: 1 };
    const sig = 'sha256=' + 'deadbeef';

    const res = await request(app).post('/test').set('x-bantabro-signature', sig).send(payload);
    expect(res.status).toBe(401);
  });
});
